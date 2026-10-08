import {
  adapterErr,
  adapterOk,
  type AdapterResult,
  type ColorScheme,
  type Conversation,
  type ConversationSummary,
  type VendorAdapter,
} from '@gaveta/shared';
import { errorKind, log } from '@/lib/log';
import { chatgptConfig as cfg } from './config';
import { parseAccessToken, parseConversation, parseConversationsPage } from './parse';

type FetchJson = { ok: true; status: number; body: unknown } | { ok: false; status: number };

/**
 * ChatGPT adapter. Reads the web app's own backend from the content script
 * (same-origin, cookies included) and falls back to the sidebar DOM for the
 * conversation list. Every call is wrapped; nothing here throws.
 */
export class ChatGPTAdapter implements VendorAdapter {
  readonly id = 'chatgpt' as const;
  readonly displayName = cfg.displayName;

  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly win: Window = window,
    private readonly fetchImpl: typeof fetch = (input, init) => window.fetch(input, init),
  ) {}

  matches(url: string): boolean {
    return cfg.urlPattern.test(url);
  }

  getSidebarMount(): Element | null {
    return this.win.document.querySelector(cfg.selectors.sidebar);
  }

  getCurrentConversationId(): string | null {
    const match = cfg.conversationPath.exec(this.win.location.pathname);
    return match?.[1] ?? null;
  }

  conversationUrl(id: string): string {
    return cfg.conversationUrl(id);
  }

  getColorScheme(): ColorScheme | null {
    const cls = this.win.document.documentElement.classList;
    if (cls.contains(cfg.selectors.darkThemeClass)) return 'dark';
    if (cls.contains(cfg.selectors.lightThemeClass)) return 'light';
    return null;
  }

  observeNavigation(cb: (url: string) => void): () => void {
    let last = this.win.location.href;
    const check = (): void => {
      const now = this.win.location.href;
      if (now !== last) {
        last = now;
        cb(now);
      }
    };
    const timer = this.win.setInterval(check, cfg.navigationPollMs);
    this.win.addEventListener('popstate', check);
    return () => {
      this.win.clearInterval(timer);
      this.win.removeEventListener('popstate', check);
    };
  }

  async listConversations(): Promise<AdapterResult<ConversationSummary[]>> {
    const viaApi = await this.listViaApi();
    if (viaApi.ok) return viaApi;
    const viaDom = this.listViaDom();
    if (viaDom.length > 0) {
      log.warn('chatgpt', 'list-fallback-dom', { code: viaApi.error.code, count: viaDom.length });
      return adapterOk(viaDom);
    }
    return viaApi;
  }

  async getConversation(id: string): Promise<AdapterResult<Conversation>> {
    const res = await this.authedJson(cfg.endpoints.conversation(id));
    if (!res.ok) return res;
    const parsed = parseConversation(id, res.value);
    if (!parsed) return adapterErr('needs-update', 'Conversation payload has an unexpected shape');
    return adapterOk(parsed);
  }

  // ---- internals ------------------------------------------------------------

  private async listViaApi(): Promise<AdapterResult<ConversationSummary[]>> {
    const all: ConversationSummary[] = [];
    for (let page = 0; page < cfg.maxPages; page += 1) {
      const offset = page * cfg.pageSize;
      const res = await this.authedJson(cfg.endpoints.conversations(offset, cfg.pageSize));
      if (!res.ok) return all.length > 0 ? adapterOk(all) : res;
      const parsed = parseConversationsPage(res.value);
      if (!parsed) return adapterErr('needs-update', 'Conversation list has an unexpected shape');
      all.push(...parsed.items);
      if (parsed.items.length < cfg.pageSize || all.length >= parsed.total) break;
    }
    return adapterOk(all);
  }

  private listViaDom(): ConversationSummary[] {
    const links = this.win.document.querySelectorAll<HTMLAnchorElement>(
      cfg.selectors.sidebarConversationLinks,
    );
    const out: ConversationSummary[] = [];
    const seen = new Set<string>();
    for (const a of links) {
      const match = cfg.conversationPath.exec(a.getAttribute('href') ?? '');
      const id = match?.[1];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, title: a.textContent?.trim() || 'Untitled', createdAt: 0, updatedAt: 0 });
    }
    return out;
  }

  private async getToken(): Promise<AdapterResult<string>> {
    if (this.token && this.token.expiresAt > Date.now()) return adapterOk(this.token.value);
    const res = await this.json(cfg.endpoints.session);
    if (!res.ok)
      return adapterErr(res.status === 0 ? 'network' : 'unauthenticated', 'Could not read session');
    const token = parseAccessToken(res.body);
    if (!token) return adapterErr('unauthenticated', 'Not logged in to ChatGPT');
    this.token = { value: token, expiresAt: Date.now() + cfg.tokenTtlMs };
    return adapterOk(token);
  }

  private async authedJson(path: string): Promise<AdapterResult<unknown>> {
    const token = await this.getToken();
    if (!token.ok) return token;
    const res = await this.json(path, token.value);
    if (res.ok) return adapterOk(res.body);
    if (res.status === 401 || res.status === 403) {
      this.token = null;
      return adapterErr('unauthenticated', 'ChatGPT rejected the session');
    }
    if (res.status === 404) return adapterErr('not-found', 'Conversation not found');
    if (res.status === 0) return adapterErr('network', 'Network error');
    return adapterErr('needs-update', `ChatGPT API responded with ${res.status}`);
  }

  private async json(path: string, bearer?: string): Promise<FetchJson> {
    try {
      const headers: Record<string, string> = { accept: 'application/json' };
      if (bearer) headers['authorization'] = `Bearer ${bearer}`;
      const response = await this.fetchImpl(`${cfg.origin}${path}`, {
        method: 'GET',
        credentials: 'include',
        headers,
        signal: AbortSignal.timeout(cfg.requestTimeoutMs),
      });
      if (!response.ok) return { ok: false, status: response.status };
      const body: unknown = await response.json();
      return { ok: true, status: response.status, body };
    } catch (e) {
      log.warn('chatgpt', 'request-failed', { kind: errorKind(e) });
      return { ok: false, status: 0 };
    }
  }
}
