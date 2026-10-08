# Claude fixtures (needs capture)

The Claude adapter in `src/adapters/claude/` is written against the last known
shape of these endpoints (cookie-authenticated, same origin):

| Endpoint                                                        | Expected shape                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /api/organizations`                                        | `[{ uuid, name, capabilities: string[] }]`                                   |
| `GET /api/organizations/:org/chat_conversations?limit&offset`   | `[{ uuid, name, created_at, updated_at }]` or `{ data: [...] }`              |
| `GET /api/organizations/:org/chat_conversations/:id?tree=True…` | `{ name, created_at, updated_at, current_leaf_message_uuid, chat_messages }` |

Nobody has confirmed those shapes against the live site yet. To capture real
responses:

1. Open https://claude.ai and log in.
2. Open DevTools → Console, paste the contents of `scripts/capture-claude-fixtures.js`, press Enter.
3. Move the three downloaded files into this directory. They are git-ignored because they contain your chats.
4. Run `pnpm test`. `test/unit/claudeFixtures.test.ts` picks them up automatically when present.

If parsing fails, update `src/adapters/claude/parse.ts` and `config.ts` only.
