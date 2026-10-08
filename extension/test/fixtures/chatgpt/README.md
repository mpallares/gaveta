# ChatGPT fixtures (needs capture)

The ChatGPT adapter in `src/adapters/chatgpt/` is written against the last
known shape of these endpoints:

| Endpoint                                                    | Expected shape                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/auth/session`                                     | `{ accessToken: string }`                                     |
| `GET /backend-api/conversations?offset&limit&order=updated` | `{ items: [{ id, title, create_time, update_time }], total }` |
| `GET /backend-api/conversation/:id`                         | `{ title, create_time, update_time, current_node, mapping }`  |

Nobody has confirmed those shapes against the live site yet. To capture real
responses:

1. Open https://chatgpt.com and log in.
2. Open DevTools → Console, paste the contents of `scripts/capture-chatgpt-fixtures.js`, press Enter.
3. Move the three downloaded files into this directory. They are git-ignored because they contain your chats.
4. Run `pnpm test`. `test/unit/chatgptParse.test.ts` picks up `chatgpt-conversation.json`
   and `chatgpt-conversations.json` automatically when present and checks they parse.

If parsing fails, update `src/adapters/chatgpt/parse.ts` and `config.ts` only.
