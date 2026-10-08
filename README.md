# Gaveta

Folders, full-text search and export for AI chat apps. ChatGPT and Claude now, Gemini and Grok later.
Local-first: chat content never leaves the browser.

A Chrome extension (Manifest V3) built with WXT, React, Tailwind, Zustand, Dexie and MiniSearch.

## Layout

| Path         | What                                                              |
| ------------ | ----------------------------------------------------------------- |
| `extension/` | The extension (WXT + React + TypeScript + Tailwind)               |
| `shared/`    | Types and the `VendorAdapter` contract shared across packages     |
| `web/`       | Next.js placeholder for the marketing site and remote-config stub |

## Requirements

- Node 22+
- pnpm 12 (`corepack enable` gives you the pinned version)
- Chrome or Chromium for manual testing

## Build

```sh
pnpm install
pnpm build          # builds extension (-> extension/.output/chrome-mv3) and web
pnpm dev            # extension dev server with hot reload (opens a Chrome profile)
```

## Load unpacked in Chrome

1. `pnpm build`
2. Open `chrome://extensions`, enable **Developer mode** (top right).
3. Click **Load unpacked** and pick `extension/.output/chrome-mv3`.
4. Open https://chatgpt.com or https://claude.ai. The Gaveta panel sits on the
   right edge; use the drawer tab to collapse or expand it.

The extension only requests `storage` and host permissions for
`https://chatgpt.com/*` and `https://claude.ai/*`. Nothing else.

## Tests

```sh
pnpm lint           # eslint + prettier --check
pnpm typecheck      # tsc in every package
pnpm test           # vitest: Dexie layer, search wrapper, export formatting, ChatGPT parsers
pnpm test:e2e       # builds the e2e bundle, then Playwright drives Chromium with it loaded
```

The Playwright run needs a browser once: `pnpm --filter @gaveta/extension exec playwright install chromium`.

The e2e build (`GAVETA_E2E=1`) adds `http://127.0.0.1:4173/*` to the manifest so
the content script runs on a local fixture page served from
`extension/test/e2e/fixture-page/`. On that page the extension uses the
`MockAdapter` fed by `extension/test/fixtures/mock-conversations.json`. The
production build never includes the localhost match; CI asserts this.

## Adapter status: both need fixtures

The ChatGPT and Claude adapters target the last known shape of each app's
in-page API. Nobody has confirmed them against the live sites yet. See
`extension/test/fixtures/chatgpt/README.md` and
`extension/test/fixtures/claude/README.md` for the DevTools snippets that
capture real responses as fixtures. If an API shape changed, the panel shows
"Gaveta needs an update for this site" instead of crashing, and the sidebar DOM
is used as a read-only fallback for the conversation list.

## Remote config

On startup the background worker fetches `https://config.gaveta.app/v1/config.json`
(per-adapter `enabled` flags plus an optional notice), caches it in
`chrome.storage.local` for six hours and falls back to a bundled default when
offline. The stub lives in `web/public/v1/config.json`. The host must send
`Access-Control-Allow-Origin: *`, which `web/next.config.ts` does.

## License

Private. All rights reserved for now.
