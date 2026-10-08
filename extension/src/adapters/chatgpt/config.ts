/**
 * EVERY chatgpt.com selector, endpoint and URL pattern lives here and nowhere
 * else. When ChatGPT changes, this is the file to update.
 *
 * STATUS: needs fixtures. The endpoint shapes below are from previously
 * observed responses. Capture current ones with `scripts/capture-chatgpt-fixtures.js`
 * and drop them into `test/fixtures/chatgpt/` to confirm.
 */
export const chatgptConfig = {
  id: 'chatgpt',
  displayName: 'ChatGPT',
  origin: 'https://chatgpt.com',
  /** Any page on the app. */
  urlPattern: /^https:\/\/chatgpt\.com(\/|$)/,
  /** `/c/<uuid>` with optional trailing segments. */
  conversationPath: /^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,

  endpoints: {
    /** Returns `{ accessToken: string, ... }` when logged in. */
    session: '/api/auth/session',
    /** Returns `{ items: [{ id, title, create_time, update_time }], total, limit, offset }`. */
    conversations: (offset: number, limit: number): string =>
      `/backend-api/conversations?offset=${offset}&limit=${limit}&order=updated`,
    /** Returns `{ title, create_time, update_time, mapping: {...}, current_node }`. */
    conversation: (id: string): string => `/backend-api/conversation/${encodeURIComponent(id)}`,
  },

  /** Paging for the conversation list. */
  pageSize: 50,
  maxPages: 20,
  /** Keep the bearer token in memory for this long. */
  tokenTtlMs: 10 * 60 * 1000,
  requestTimeoutMs: 15_000,

  selectors: {
    /** The app's own history sidebar. */
    sidebar: 'nav',
    /** Links to conversations in the sidebar; used only as a fallback when the API fails. */
    sidebarConversationLinks: 'nav a[href^="/c/"]',
    /** `<html class="dark">` / `<html class="light">` reflects the app's theme choice. */
    darkThemeClass: 'dark',
    lightThemeClass: 'light',
  },

  /** Poll interval for SPA navigation detection (no history hooks from the isolated world). */
  navigationPollMs: 500,

  conversationUrl: (id: string): string => `https://chatgpt.com/c/${encodeURIComponent(id)}`,
} as const;
