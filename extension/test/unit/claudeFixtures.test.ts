import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parseConversation,
  parseConversationList,
  parseOrganizations,
} from '@/adapters/claude/parse';

const dir = fileURLToPath(new URL('../fixtures/claude/', import.meta.url));
const orgsPath = `${dir}claude-organizations.json`;
const listPath = `${dir}claude-conversations.json`;
const convPath = `${dir}claude-conversation.json`;
const have = existsSync(orgsPath) && existsSync(listPath) && existsSync(convPath);

/** Runs only when real captured fixtures are present (see fixtures/claude/README.md). */
describe.skipIf(!have)('claude captured fixtures', () => {
  it('parses the captured organisations', () => {
    const orgs = parseOrganizations(JSON.parse(readFileSync(orgsPath, 'utf8')));
    expect(orgs?.length).toBeGreaterThan(0);
  });

  it('parses the captured conversation list', () => {
    const items = parseConversationList(JSON.parse(readFileSync(listPath, 'utf8')));
    expect(items?.length).toBeGreaterThan(0);
  });

  it('parses the captured conversation', () => {
    const c = parseConversation('captured', JSON.parse(readFileSync(convPath, 'utf8')));
    expect(c?.messages.length).toBeGreaterThan(0);
  });
});
