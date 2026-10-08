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
import { claudeConfig as cfg } from './config';
import { parseConversation, parseConversationList, parseOrganizations } from './parse';

type FetchJson = { ok: true; status: number; body: unknown } | { ok: false; status: number };

/**
 * Claude adapter. Claude's web app authenticates with cookies, so same-origin
 * fetches from the content script carry the session. Every call is wrapped;
 * nothing here throws.
 */
export class ClaudeAdapter implements VendorAdapter {
  readonly id = 'claude' as const;
  readonly displayName = cfg.displayName;

  private org: { id: string; expiresAt: number } | null = null;

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
    const mode = this.win.document.documentElement.getAttribute(cfg.selectors.themeAttribute);
    return mode === 'dark' || mode === 'light' ? mode : null;
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
      log.warn('claude', 'list-fallback-dom', { code: viaApi.error.code, count: viaDom.length });
      return adapterOk(viaDom);
    }
    return viaApi;
  }

  async getConversation(id: string): Promise<AdapterResult<Conversation>> {
    const org = await this.getOrgId();
    if (!org.ok) return org;
    const res = await this.apiJson(cfg.endpoints.conversation(org.value, id));
    if (!res.ok) return res;
    const parsed = parseConversation(id, res.value);
    if (!parsed) return adapterErr('needs-update', 'Conversation payload has an unexpected shape');
    return adapterOk(parsed);
  }

  // ---- internals ------------------------------------------------------------

  private async listViaApi(): Promise<AdapterResult<ConversationSummary[]>> {
    const org = await this.getOrgId();
    if (!org.ok) return org;
    const all: ConversationSummary[] = [];
    const seen = new Set<string>();
    for (let page = 0; page < cfg.maxPages; page += 1) {
      const res = await this.apiJson(
        cfg.endpoints.conversations(org.value, page * cfg.pageSize, cfg.pageSize),
      );
      if (!res.ok) return all.length > 0 ? adapterOk(all) : res;
      const items = parseConversationList(res.value);
      if (!items) return adapterErr('needs-update', 'Conversation list has an unexpected shape');
      let added = 0;
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        all.push(item);
        added += 1;
      }
      // Older deployments ignore paging and return everything at once.
      if (items.length < cfg.pageSize || added === 0) break;
    }
    return adapterOk(all.sort((a, b) => b.updatedAt - a.updatedAt));
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

  /** Organisation from the `lastActiveOrg` cookie when readable, else the first chat-capable one. */
  private async getOrgId(): Promise<AdapterResult<string>> {
    if (this.org && this.org.expiresAt > Date.now()) return adapterOk(this.org.id);
    const res = await this.json(cfg.endpoints.organizations);
    if (!res.ok) {
      if (res.status === 0) return adapterErr('network', 'Network error');
      return adapterErr(
        res.status === 401 || res.status === 403 ? 'unauthenticated' : 'needs-update',
        'Could not read organisations',
      );
    }
    const orgs = parseOrganizations(res.body);
    if (!orgs) return adapterErr('needs-update', 'Organisation list has an unexpected shape');
    if (orgs.length === 0) return adapterErr('unauthenticated', 'Not logged in to Claude');
    const fromCookie = this.readCookie(cfg.activeOrgCookie);
    const chosen =
      orgs.find((o) => o.id === fromCookie) ??
      orgs.find((o) => o.capabilities.includes(cfg.chatCapability)) ??
      orgs[0];
    if (!chosen) return adapterErr('unauthenticated', 'Not logged in to Claude');
    this.org = { id: chosen.id, expiresAt: Date.now() + cfg.orgTtlMs };
    return adapterOk(chosen.id);
  }

  private readCookie(name: string): string | null {
    const prefix = `${name}=`;
    for (const part of this.win.document.cookie.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
    }
    return null;
  }

  private async apiJson(path: string): Promise<AdapterResult<unknown>> {
    const res = await this.json(path);
    if (res.ok) return adapterOk(res.body);
    if (res.status === 401 || res.status === 403) {
      this.org = null;
      return adapterErr('unauthenticated', 'Claude rejected the session');
    }
    if (res.status === 404) return adapterErr('not-found', 'Conversation not found');
    if (res.status === 0) return adapterErr('network', 'Network error');
    return adapterErr('needs-update', `Claude API responded with ${res.status}`);
  }

  private async json(path: string): Promise<FetchJson> {
    try {
      const response = await this.fetchImpl(`${cfg.origin}${path}`, {
        method: 'GET',
        credentials: 'include',
        headers: { ...cfg.headers },
        signal: AbortSignal.timeout(cfg.requestTimeoutMs),
      });
      if (!response.ok) return { ok: false, status: response.status };
      const body: unknown = await response.json();
      return { ok: true, status: response.status, body };
    } catch (e) {
      log.warn('claude', 'request-failed', { kind: errorKind(e) });
      return { ok: false, status: 0 };
    }
  }
}
