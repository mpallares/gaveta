import {
  adapterErr,
  adapterOk,
  type AdapterResult,
  type ColorScheme,
  type Conversation,
  type ConversationSummary,
  type VendorAdapter,
} from '@gaveta/shared';
import fixtures from '../../../test/fixtures/mock-conversations.json';

interface MockFixtures {
  conversations: Conversation[];
}

export interface MockAdapterOptions {
  conversations?: Conversation[];
  /** Simulated latency in ms. */
  delayMs?: number;
  /** Force every call to fail with this code (for UI states). */
  failWith?: 'needs-update' | 'unauthenticated' | 'network';
  win?: Window;
}

/** Fixture-backed adapter used by tests and the Playwright fixture page. */
export class MockAdapter implements VendorAdapter {
  readonly id = 'mock' as const;
  readonly displayName = 'Mock';

  private readonly conversations: Map<string, Conversation>;
  private readonly delayMs: number;
  private readonly failWith: MockAdapterOptions['failWith'];
  private readonly win: Window | null;
  calls = { list: 0, get: 0 };

  constructor(opts: MockAdapterOptions = {}) {
    const source = opts.conversations ?? (fixtures as MockFixtures).conversations;
    this.conversations = new Map(source.map((c) => [c.id, c]));
    this.delayMs = opts.delayMs ?? 0;
    this.failWith = opts.failWith;
    this.win = opts.win ?? (typeof window !== 'undefined' ? window : null);
  }

  matches(url: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url) || url.startsWith('file:');
  }

  getSidebarMount(): Element | null {
    return this.win?.document.querySelector('[data-gaveta-mount]') ?? null;
  }

  getCurrentConversationId(): string | null {
    const hash = this.win?.location.hash ?? '';
    const m = /^#\/c\/(.+)$/.exec(hash);
    return m?.[1] ?? null;
  }

  conversationUrl(id: string): string {
    return `#/c/${encodeURIComponent(id)}`;
  }

  getColorScheme(): ColorScheme | null {
    return null;
  }

  observeNavigation(cb: (url: string) => void): () => void {
    if (!this.win) return () => undefined;
    const handler = (): void => cb(this.win?.location.href ?? '');
    this.win.addEventListener('hashchange', handler);
    return () => this.win?.removeEventListener('hashchange', handler);
  }

  async listConversations(): Promise<AdapterResult<ConversationSummary[]>> {
    this.calls.list += 1;
    await this.wait();
    if (this.failWith) return adapterErr(this.failWith, 'Mock failure');
    const summaries = [...this.conversations.values()]
      .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return adapterOk(summaries);
  }

  async getConversation(id: string): Promise<AdapterResult<Conversation>> {
    this.calls.get += 1;
    await this.wait();
    if (this.failWith) return adapterErr(this.failWith, 'Mock failure');
    const c = this.conversations.get(id);
    return c ? adapterOk(structuredClone(c)) : adapterErr('not-found', 'No such conversation');
  }

  /** Test helper: simulate the vendor updating a chat. */
  touch(id: string, extra: Conversation['messages']): void {
    const c = this.conversations.get(id);
    if (!c) return;
    c.messages.push(...extra);
    c.updatedAt = Date.now();
  }

  private wait(): Promise<void> {
    return this.delayMs > 0 ? new Promise((r) => setTimeout(r, this.delayMs)) : Promise.resolve();
  }
}
