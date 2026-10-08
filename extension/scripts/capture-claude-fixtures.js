/*
 * Paste this whole file into the DevTools console on https://claude.ai while
 * logged in. It downloads three JSON fixtures:
 *   claude-organizations.json   (names kept, nothing else sensitive)
 *   claude-conversations.json   (first page of the list)
 *   claude-conversation.json    (the most recent conversation, full tree)
 * Save them into extension/test/fixtures/claude/ (git-ignored: they contain
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
  const h = { accept: 'application/json', 'anthropic-client-platform': 'web_claude_ai' };
  const get = (path) =>
    fetch(path, { headers: h, credentials: 'include' }).then((r) =>
      r.ok ? r.json() : { __status: r.status },
    );

  const orgs = await get('/api/organizations');
  save('claude-organizations.json', orgs);
  const org = Array.isArray(orgs) && orgs.find((o) => (o.capabilities || []).includes('chat'));
  if (!org) {
    console.warn('No chat-capable organisation found. Shape:', orgs);
    return;
  }
  const list = await get(`/api/organizations/${org.uuid}/chat_conversations?limit=5&offset=0`);
  save('claude-conversations.json', list);
  const items = Array.isArray(list) ? list : list && list.data;
  const firstId = items && items[0] && items[0].uuid;
  if (!firstId) {
    console.warn('Conversation list had no items or an unexpected shape:', list);
    return;
  }
  const conv = await get(
    `/api/organizations/${org.uuid}/chat_conversations/${firstId}?tree=True&rendering_mode=messages&render_all_tools=true`,
  );
  save('claude-conversation.json', conv);
  console.log('Done. Three files downloaded. Status codes are inside the files if a call failed.');
})();
