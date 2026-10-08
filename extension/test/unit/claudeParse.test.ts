import { describe, expect, it } from 'vitest';
import {
  parseConversation,
  parseConversationList,
  parseOrganizations,
} from '@/adapters/claude/parse';

describe('claude parse', () => {
  it('reads organisations with capabilities', () => {
    expect(
      parseOrganizations([
        { uuid: 'o1', name: 'Personal', capabilities: ['chat', 'claude_pro'] },
        { nope: 1 },
      ]),
    ).toEqual([{ id: 'o1', name: 'Personal', capabilities: ['chat', 'claude_pro'] }]);
    expect(parseOrganizations({})).toBeNull();
  });

  it('parses a conversation list as a bare array or a data envelope', () => {
    const entry = {
      uuid: 'c1',
      name: ' Hello ',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    const expected = [
      {
        id: 'c1',
        title: 'Hello',
        createdAt: Date.UTC(2026, 0, 1),
        updatedAt: Date.UTC(2026, 0, 2),
      },
    ];
    expect(parseConversationList([entry])).toEqual(expected);
    expect(parseConversationList({ data: [entry] })).toEqual(expected);
    expect(parseConversationList([{ uuid: 'c2', name: '' }])).toEqual([
      { id: 'c2', title: 'Untitled', createdAt: 0, updatedAt: 0 },
    ]);
    expect(parseConversationList({ items: [] })).toBeNull();
  });

  it('follows current_leaf_message_uuid through a tree and joins text blocks', () => {
    const raw = {
      name: 'Tree',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T01:00:00Z',
      current_leaf_message_uuid: 'a2',
      chat_messages: [
        {
          uuid: 'u1',
          parent_message_uuid: '00000000-0000-4000-8000-000000000000',
          sender: 'human',
          text: 'hi',
          content: [{ type: 'text', text: 'hi' }],
          created_at: '2026-01-01T00:10:00Z',
        },
        {
          uuid: 'a1',
          parent_message_uuid: 'u1',
          sender: 'assistant',
          content: [{ type: 'text', text: 'old branch' }],
        },
        {
          uuid: 'a2',
          parent_message_uuid: 'u1',
          sender: 'assistant',
          content: [
            { type: 'tool_use', name: 'search' },
            { type: 'text', text: 'first' },
            { type: 'text', text: 'second' },
          ],
        },
      ],
    };
    const c = parseConversation('x', raw);
    expect(c?.title).toBe('Tree');
    expect(c?.updatedAt).toBe(Date.UTC(2026, 0, 1, 1));
    expect(c?.messages).toEqual([
      { role: 'user', text: 'hi', ts: Date.UTC(2026, 0, 1, 0, 10) },
      { role: 'assistant', text: 'first\nsecond', ts: null },
    ]);
  });

  it('falls back to list order without a leaf pointer and to `text` without blocks', () => {
    const c = parseConversation('x', {
      name: '',
      chat_messages: [
        { uuid: '1', sender: 'human', text: 'q' },
        { uuid: '2', sender: 'assistant', text: 'a' },
        { uuid: '3', sender: 'system', text: 'ignored' },
      ],
    });
    expect(c?.title).toBe('Untitled');
    expect(c?.messages.map((m) => m.text)).toEqual(['q', 'a']);
  });

  it('returns null on unexpected shapes', () => {
    expect(parseConversation('x', {})).toBeNull();
    expect(parseConversation('x', null)).toBeNull();
  });
});
