import { describe, expect, it } from 'vitest';
import {
  parseAccessToken,
  parseConversation,
  parseConversationsPage,
} from '@/adapters/chatgpt/parse';

describe('chatgpt parse', () => {
  it('reads the access token', () => {
    expect(parseAccessToken({ accessToken: 'tok' })).toBe('tok');
    expect(parseAccessToken({})).toBeNull();
    expect(parseAccessToken(null)).toBeNull();
  });

  it('parses a conversation list page and converts seconds to ms', () => {
    const page = parseConversationsPage({
      items: [
        {
          id: 'a',
          title: 'A',
          create_time: '2026-01-01T00:00:00.000Z',
          update_time: '2026-01-02T00:00:00.000Z',
        },
        { id: 'b', title: 'B', create_time: 1700000000, update_time: 1700000100.5 },
        { nope: true },
      ],
      total: 2,
    });
    expect(page?.items).toEqual([
      { id: 'a', title: 'A', createdAt: Date.UTC(2026, 0, 1), updatedAt: Date.UTC(2026, 0, 2) },
      { id: 'b', title: 'B', createdAt: 1700000000000, updatedAt: 1700000100500 },
    ]);
    expect(parseConversationsPage({ wrong: [] })).toBeNull();
  });

  it('walks the active branch from current_node and skips hidden/system nodes', () => {
    const raw = {
      title: 'Branches',
      create_time: 1700000000,
      update_time: 1700000500,
      current_node: 'a2',
      mapping: {
        root: { id: 'root', parent: null, children: ['sys'] },
        sys: {
          id: 'sys',
          parent: 'root',
          message: {
            author: { role: 'system' },
            content: { content_type: 'text', parts: ['sys prompt'] },
          },
        },
        u1: {
          id: 'u1',
          parent: 'sys',
          message: {
            author: { role: 'user' },
            create_time: 1700000100,
            content: { content_type: 'text', parts: ['hello'] },
          },
        },
        a1: {
          id: 'a1',
          parent: 'u1',
          message: {
            author: { role: 'assistant' },
            content: { content_type: 'text', parts: ['old answer'] },
          },
        },
        a2: {
          id: 'a2',
          parent: 'u1',
          message: {
            author: { role: 'assistant' },
            content: { content_type: 'text', parts: ['new answer'] },
          },
        },
        hidden: {
          id: 'hidden',
          parent: 'a2',
          message: {
            author: { role: 'user' },
            metadata: { is_visually_hidden_from_conversation: true },
            content: { content_type: 'text', parts: ['hidden'] },
          },
        },
      },
    };
    const c = parseConversation('x', raw);
    expect(c?.title).toBe('Branches');
    expect(c?.updatedAt).toBe(1700000500000);
    expect(c?.messages).toEqual([
      { role: 'user', text: 'hello', ts: 1700000100000 },
      { role: 'assistant', text: 'new answer', ts: null },
    ]);
  });

  it('returns null on unexpected shapes', () => {
    expect(parseConversation('x', {})).toBeNull();
    expect(parseConversation('x', { mapping: {} })).toBeNull();
  });
});
