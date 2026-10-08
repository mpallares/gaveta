# CLAUDE.md

Guidance for AI assistants and humans working in this repo.

## What this is

Gaveta: a Manifest V3 Chrome extension that adds folders, full-text search and
export to AI chat apps (ChatGPT and Claude now, Gemini and Grok later).
Local-first. No chat content ever leaves the browser. No analytics, no
telemetry, no remotely hosted code.

## The one rule

**Adapters are the only place selectors and endpoints live.**
Every vendor URL pattern, API path, DOM selector and response parser belongs in
`extension/src/adapters/<vendor>/`, with the constants in that vendor's
`config.ts`. UI, store, db and search code must never know a vendor's URL or
DOM. If you need something from the page, add it to the `VendorAdapter`
contract in `shared/src/adapters/VendorAdapter.ts` and implement it per vendor.

## Stack (fixed)

- pnpm workspace: `extension/` (WXT + React 19 + TypeScript + Tailwind 4),
  `shared/` (types + adapter contract), `web/` (Next.js placeholder).
- UI mounted with WXT `createShadowRootUi`; styles stay inside the shadow root.
- State: Zustand (vanilla store + `useGaveta` selector hook).
- Persistence: Dexie (IndexedDB). Search: MiniSearch serialised into Dexie.
- Settings only in `chrome.storage.sync` (license), small caches in `chrome.storage.local`.
- Tests: Vitest (unit, `fake-indexeddb`), Playwright (unpacked extension in Chromium).
- Host permissions: `https://chatgpt.com/*`, `https://claude.ai/*`. Never `<all_urls>`.

## Architecture

```
shared/src/adapters/VendorAdapter.ts   contract: id, matches, listConversations,
                                       getConversation, getSidebarMount, observeNavigation,
                                       getCurrentConversationId, conversationUrl, getColorScheme
extension/src/adapters/registry.ts     picks the adapter for the current URL
extension/src/adapters/chatgpt/        config.ts (all constants), parse.ts (pure), ChatGPTAdapter.ts
extension/src/adapters/claude/         same layout; cookie auth, organisation lookup, message tree
extension/src/adapters/mock/           MockAdapter fed by test/fixtures/mock-conversations.json
extension/src/db/                      Dexie schema + small, pure-ish data access modules
extension/src/lib/search/              SearchIndex (MiniSearch wrapper), indexer (incremental sync)
extension/src/lib/export/              markdown/json formatting, filenames, download helper
extension/src/store/gavetaStore.ts     Zustand store; all side effects go through it
extension/src/ui/                      React components, no vendor knowledge
extension/src/entrypoints/             background.ts, gaveta.content/ (panel), popup/
```

Data flow: content script resolves an adapter → store `init()` loads Dexie +
serialised index → `sync()` lists conversations via the adapter, upserts
metadata, fetches and indexes only conversations whose `updatedAt` moved
(`indexedUpdatedAt`), then persists the index. Navigation triggers `sync()`.

Messaging: typed request/response pairs in `shared/src/types/messages.ts`;
`lib/messaging.ts` wraps `runtime.sendMessage`. Background owns license state,
remote-config cache and export jobs (formatting). The content script triggers
the actual file download with an anchor element, so no `downloads` permission.

## Conventions

- TypeScript strict. No `any`. No non-null assertions. Small modules.
- **Never put chat text (titles, messages, previews) in logs or error messages.**
  Use `lib/log.ts` with codes and counts only. Error messages shown in the UI
  describe the failure, never the content.
- Every adapter call returns `AdapterResult`, never throws. Unexpected payload
  shape → `needs-update`. 401/403 → `unauthenticated`. The panel shows a banner
  for these states and keeps working on already indexed data.
- Conversation keys are `${vendorId}:${conversationId}` everywhere in storage.
- A conversation lives in at most one folder (move semantics).
- `data-testid` attributes on interactive elements; e2e tests rely on them.
- Prettier formats everything; ESLint flat config at the root.
- Commit messages: imperative mood, short subject.

## Decisions made in Phase 1

- Theme detection goes through `VendorAdapter.getColorScheme()` so the content
  script never reads a vendor's `html` class or attribute itself.
- Panel is a fixed overlay on the right edge mounted on `body`, not injected into
  ChatGPT's sidebar DOM (which changes often). `getSidebarMount()` stays in the
  contract for a future "docked" mode.
- Free tier: 5 folders total (sub-folders count). The cap is enforced in
  `db/folders.ts` (`FolderLimitError`); the store flips `limitHit` and the UI
  shows an upgrade state. No payment flow.
- Search results store only title and vendor in MiniSearch (`storeFields`); the
  preview shown in results comes from `conversations_meta.preview`.
- SPA navigation on chatgpt.com is detected by polling `location.href` every
  500 ms plus `popstate` (content scripts cannot hook `history.pushState`).
- Remote config is fetched from the background worker with a 5 s timeout and a
  6 h cache; the static host must send CORS headers so no extra host permission
  is needed. Config is data only, never code.
- The e2e build (`GAVETA_E2E=1`) adds a localhost match and the MockAdapter;
  the production manifest never contains it (asserted in CI).
- WXT `experimental.escapeUnicode` is on: Chrome otherwise refuses the built
  content script with "isn't UTF-8 encoded" and silently skips the extension.
- TypeScript is pinned to 5.9 because typescript-eslint does not support 7.x yet.
- Playwright uses `channel: 'chromium'` (Chrome for Testing); branded Chrome
  removed `--load-extension`.

## ChatGPT and Claude adapters: need fixtures

The endpoint shapes in `adapters/chatgpt/config.ts` and `adapters/claude/config.ts`
are from previously observed responses, unconfirmed against the live sites.
Capture real responses with `extension/scripts/capture-chatgpt-fixtures.js` and
`extension/scripts/capture-claude-fixtures.js` (see the README in each
`test/fixtures/<vendor>/` directory). The fixture-driven tests
`test/unit/chatgptFixtures.test.ts` and `test/unit/claudeFixtures.test.ts` run
automatically when fixtures exist.

Claude specifics: auth is cookie-based (no bearer token); conversations hang off
an organisation, chosen from the `lastActiveOrg` cookie when readable, else the
first chat-capable one; the conversation payload is a message tree walked from
`current_leaf_message_uuid`.

## Commands

```sh
pnpm lint        pnpm typecheck     pnpm test      pnpm test:e2e     pnpm build
pnpm --filter @gaveta/extension dev        # WXT dev server
pnpm --filter @gaveta/extension build:e2e  # bundle with the localhost match
```

## Phase 2 TODOs (not built yet)

- [ ] Lemon Squeezy license-key validation in the popup; background keeps `LicenseState.tier` in sync.
- [ ] Gemini adapter.
- [ ] Grok adapter.
- [ ] Client-side-encrypted sync of folders, pins and tags (never chat content unless opted in).
- [ ] Tags UI (the `tags` table and `tagIds` index exist already).
- [ ] Docked panel mode using `getSidebarMount()`.
- [ ] Bulk export of a folder.
