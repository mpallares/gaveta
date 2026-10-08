/*
 * Paste this whole file into the DevTools console on https://chatgpt.com while
 * logged in. It downloads three JSON fixtures:
 *   chatgpt-session.json        (token REDACTED)
 *   chatgpt-conversations.json  (first page of the list)
 *   chatgpt-conversation.json   (the most recent conversation)
 * Save them into extension/test/fixtures/chatgpt/ (git-ignored: they contain
 * your chat content). Then run `pnpm test` and look at the adapter parse tests.
 */
(async () => {
  const save = (name, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };
  const session = await fetch('/api/auth/session', { credentials: 'include' }).then((r) =>
    r.json(),
  );
  const token = session.accessToken;
  save('chatgpt-session.json', {
    ...session,
    accessToken: token ? 'REDACTED' : null,
    user: undefined,
  });
  if (!token) {
    console.warn(
      'No accessToken in /api/auth/session. Are you logged in? Shape:',
      Object.keys(session),
    );
    return;
  }
  const h = { authorization: `Bearer ${token}`, accept: 'application/json' };
  const list = await fetch('/backend-api/conversations?offset=0&limit=5&order=updated', {
    headers: h,
    credentials: 'include',
  }).then((r) => (r.ok ? r.json() : { __status: r.status }));
  save('chatgpt-conversations.json', list);
  const firstId = list && list.items && list.items[0] && list.items[0].id;
  if (!firstId) {
    console.warn('Conversation list had no items or an unexpected shape:', list);
    return;
  }
  const conv = await fetch(`/backend-api/conversation/${firstId}`, {
    headers: h,
    credentials: 'include',
  }).then((r) => (r.ok ? r.json() : { __status: r.status }));
  save('chatgpt-conversation.json', conv);
  console.log('Done. Three files downloaded. Status codes are inside the files if a call failed.');
})();
