import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseConversation, parseConversationsPage } from '@/adapters/chatgpt/parse';

const dir = fileURLToPath(new URL('../fixtures/chatgpt/', import.meta.url));
const listPath = `${dir}chatgpt-conversations.json`;
const convPath = `${dir}chatgpt-conversation.json`;
const have = existsSync(listPath) && existsSync(convPath);

/** Runs only when real captured fixtures are present (see fixtures/chatgpt/README.md). */
describe.skipIf(!have)('chatgpt captured fixtures', () => {
  it('parses the captured conversation list', () => {
    const raw: unknown = JSON.parse(readFileSync(listPath, 'utf8'));
    const page = parseConversationsPage(raw);
    expect(page).not.toBeNull();
    expect(page?.items.length).toBeGreaterThan(0);
  });

  it('parses the captured conversation', () => {
    const raw: unknown = JSON.parse(readFileSync(convPath, 'utf8'));
    const c = parseConversation('captured', raw);
    expect(c).not.toBeNull();
    expect(c?.messages.length).toBeGreaterThan(0);
  });
});
