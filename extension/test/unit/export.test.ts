import { describe, expect, it } from 'vitest';
import type { Conversation } from '@gaveta/shared';
import { buildExport, exportFilename, slugify, toJson, toMarkdown } from '@/lib/export';

const conversation: Conversation = {
  id: 'abc',
  title: 'Sourdough: starter troubleshooting!',
  createdAt: Date.UTC(2026, 0, 1, 10, 0, 0),
  updatedAt: Date.UTC(2026, 0, 1, 11, 0, 0),
  messages: [
    { role: 'user', text: 'My starter smells like acetone.', ts: Date.UTC(2026, 0, 1, 10, 0, 0) },
    { role: 'assistant', text: 'Feed it.\n\n```sh\necho hungry\n```', ts: null },
  ],
};

describe('markdown export', () => {
  it('renders a heading, metadata and one section per message', () => {
    const md = toMarkdown(conversation, 'ChatGPT');
    expect(md).toMatchInlineSnapshot(`
      "# Sourdough: starter troubleshooting!

      - Source: ChatGPT
      - Conversation id: abc
      - Created: 2026-01-01T10:00:00.000Z
      - Updated: 2026-01-01T11:00:00.000Z
      - Messages: 2

      ## User (2026-01-01T10:00:00.000Z)

      My starter smells like acetone.

      ## Assistant

      Feed it.

      \`\`\`sh
      echo hungry
      \`\`\`
      "
    `);
  });

  it('falls back to a title when empty', () => {
    expect(toMarkdown({ ...conversation, title: '  ' }, 'Mock')).toMatch(
      /^# Untitled conversation/,
    );
  });
});

describe('json export', () => {
  it('wraps the conversation in a versioned envelope', () => {
    const parsed: unknown = JSON.parse(toJson(conversation, 'chatgpt', new Date(0)));
    expect(parsed).toEqual({
      format: 'gaveta.conversation',
      version: 1,
      exportedAt: '1970-01-01T00:00:00.000Z',
      vendor: 'chatgpt',
      conversation,
    });
  });
});

describe('filenames', () => {
  it('slugifies titles safely', () => {
    expect(slugify('Sourdough: starter troubleshooting!')).toBe(
      'sourdough-starter-troubleshooting',
    );
    expect(slugify('Olá, São Paulo / 2026')).toBe('ola-sao-paulo-2026');
    expect(slugify('')).toBe('conversation');
    expect(slugify('x'.repeat(100))).toHaveLength(60);
  });

  it('prefixes the date and picks the extension by format', () => {
    const d = new Date(Date.UTC(2026, 9, 8));
    expect(exportFilename('Hello world', 'markdown', d)).toBe('2026-10-08-hello-world.md');
    expect(exportFilename('Hello world', 'json', d)).toBe('2026-10-08-hello-world.json');
  });

  it('buildExport returns filename, mime and content', () => {
    const file = buildExport(conversation, 'mock', 'json', new Date(Date.UTC(2026, 9, 8)));
    expect(file.filename).toBe('2026-10-08-sourdough-starter-troubleshooting.json');
    expect(file.mime).toContain('application/json');
    expect(file.content).toContain('"vendor": "mock"');
  });
});
