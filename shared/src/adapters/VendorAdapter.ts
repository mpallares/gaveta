import type { Conversation, ConversationSummary } from '../types/conversation';
import type { VendorId } from '../types/vendor';

/**
 * Why an adapter call failed. Messages MUST NOT contain chat content; they are
 * shown in the UI and may end up in bug reports.
 */
export type AdapterErrorCode =
  | 'needs-update' // endpoint or DOM shape changed; the adapter must be updated
  | 'unauthenticated' // user is not logged in to the vendor
  | 'network' // transient network failure
  | 'not-found' // conversation does not exist (any more)
  | 'disabled' // adapter disabled by remote config
  | 'unknown';

export interface AdapterError {
  code: AdapterErrorCode;
  message: string;
}

export type ColorScheme = 'light' | 'dark';

export type AdapterResult<T> = { ok: true; value: T } | { ok: false; error: AdapterError };

export function adapterOk<T>(value: T): AdapterResult<T> {
  return { ok: true, value };
}

export function adapterErr<T = never>(code: AdapterErrorCode, message: string): AdapterResult<T> {
  return { ok: false, error: { code, message } };
}

/**
 * Contract every vendor integration implements. Adapters are the ONLY place
 * where vendor selectors and endpoints live.
 */
export interface VendorAdapter {
  readonly id: VendorId;
  readonly displayName: string;

  /** True when this adapter should drive the page at `url`. */
  matches(url: string): boolean;

  /** All conversations the user can see, newest first when the vendor supports ordering. */
  listConversations(): Promise<AdapterResult<ConversationSummary[]>>;

  /** Full conversation with messages. */
  getConversation(id: string): Promise<AdapterResult<Conversation>>;

  /** Element the panel can anchor to, or null to fall back to a floating panel on `body`. */
  getSidebarMount(): Element | null;

  /**
   * Call `cb` whenever the in-app route changes (SPA navigation). Returns an
   * unsubscribe function.
   */
  observeNavigation(cb: (url: string) => void): () => void;

  /** Conversation id of the chat currently open, if any. */
  getCurrentConversationId(): string | null;

  /** Absolute URL that opens a conversation in the vendor's app. */
  conversationUrl(id: string): string;

  /** The theme the vendor app has explicitly chosen, or null to follow the OS. */
  getColorScheme(): ColorScheme | null;
}
