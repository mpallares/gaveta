/**
 * EVERY claude.ai selector, endpoint and URL pattern lives here and nowhere
 * else. When Claude changes, this is the file to update.
 *
 * STATUS: needs fixtures. The endpoint shapes below are from previously
 * observed responses. Capture current ones with `scripts/capture-claude-fixtures.js`
 * and drop them into `test/fixtures/claude/` to confirm.
 */
export const claudeConfig = {
  id: 'claude',
  displayName: 'Claude',
  origin: 'https://claude.ai',
  /** Any page on the app. */
  urlPattern: /^https:\/\/claude\.ai(\/|$)/,
  /** `/chat/<uuid>` with optional trailing segments. */
  conversationPath: /^\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,

  endpoints: {
    /** Returns `[{ uuid, name, capabilities: string[] }]`. Auth is cookie-based. */
    organizations: '/api/organizations',
    /** Returns `[{ uuid, name, summary, created_at, updated_at }]` (newest first), or `{ data: [...] }`. */
    conversations: (orgId: string, offset: number, limit: number): string =>
      `/api/organizations/${encodeURIComponent(orgId)}/chat_conversations?limit=${limit}&offset=${offset}`,
    /**
     * Returns `{ uuid, name, created_at, updated_at, current_leaf_message_uuid,
     * chat_messages: [{ uuid, parent_message_uuid, sender, text, content: [{ type, text }], created_at }] }`.
     */
    conversation: (orgId: string, id: string): string =>
      `/api/organizations/${encodeURIComponent(orgId)}/chat_conversations/${encodeURIComponent(id)}?tree=True&rendering_mode=messages&render_all_tools=true`,
  },

  /** Request headers Claude's web client sends; harmless if ignored. */
  headers: {
    accept: 'application/json',
    'anthropic-client-platform': 'web_claude_ai',
  },

  /** Non-HttpOnly cookie Claude sets with the organisation currently in use. */
  activeOrgCookie: 'lastActiveOrg',
  /** Organisation capability that marks a workspace as chat-enabled. */
  chatCapability: 'chat',

  pageSize: 50,
  maxPages: 20,
  orgTtlMs: 30 * 60 * 1000,
  requestTimeoutMs: 15_000,

  selectors: {
    sidebar: 'nav',
    /** Links to conversations in the sidebar; used only as a fallback when the API fails. */
    sidebarConversationLinks: 'nav a[href^="/chat/"]',
    /** `<html data-mode="dark">` reflects the app's theme choice. */
    themeAttribute: 'data-mode',
  },

  navigationPollMs: 500,

  conversationUrl: (id: string): string => `https://claude.ai/chat/${encodeURIComponent(id)}`,
} as const;
