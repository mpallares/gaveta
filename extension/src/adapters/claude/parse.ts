import type { Conversation, ConversationSummary, Message, MessageRole } from '@gaveta/shared';

/**
 * Pure parsers for claude.ai API payloads. They accept `unknown` and return
 * null when the shape is not what we expect, so callers can report "needs update".
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toMs(v: unknown): number {
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof v === 'number' && Number.isFinite(v))
    return v > 1e12 ? Math.round(v) : Math.round(v * 1000);
  return 0;
}

export interface Organization {
  id: string;
  name: string;
  capabilities: string[];
}

export function parseOrganizations(raw: unknown): Organization[] | null {
  if (!Array.isArray(raw)) return null;
  const orgs: Organization[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry['uuid'] !== 'string') continue;
    const caps = Array.isArray(entry['capabilities'])
      ? entry['capabilities'].filter((c): c is string => typeof c === 'string')
      : [];
    orgs.push({
      id: entry['uuid'],
      name: typeof entry['name'] === 'string' ? entry['name'] : '',
      capabilities: caps,
    });
  }
  return orgs;
}

/** Accepts either a bare array or `{ data: [...] }`. */
export function parseConversationList(raw: unknown): ConversationSummary[] | null {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw['data'])
      ? raw['data']
      : null;
  if (!list) return null;
  const items: ConversationSummary[] = [];
  for (const entry of list) {
    if (!isRecord(entry) || typeof entry['uuid'] !== 'string') continue;
    const name = typeof entry['name'] === 'string' ? entry['name'].trim() : '';
    items.push({
      id: entry['uuid'],
      title: name === '' ? 'Untitled' : name,
      createdAt: toMs(entry['created_at']),
      updatedAt: toMs(entry['updated_at']),
    });
  }
  return items;
}

const SENDER_ROLE: Record<string, MessageRole> = {
  human: 'user',
  user: 'user',
  assistant: 'assistant',
};

/** Joins the text blocks of a message's `content` array; falls back to `text`. */
function messageText(message: Record<string, unknown>): string {
  const content = message['content'];
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block['type'] === 'text' && typeof block['text'] === 'string') parts.push(block['text']);
    }
    const joined = parts.join('\n').trim();
    if (joined !== '') return joined;
  }
  return typeof message['text'] === 'string' ? message['text'].trim() : '';
}

interface Node {
  id: string;
  parent: string | null;
  message: Record<string, unknown>;
}

function toMessage(message: Record<string, unknown>): Message | null {
  const sender = message['sender'];
  const role = typeof sender === 'string' ? SENDER_ROLE[sender] : undefined;
  if (!role) return null;
  const text = messageText(message);
  if (text === '') return null;
  const ts = toMs(message['created_at']);
  return { role, text, ts: ts || null };
}

/**
 * Builds the active branch. With `tree=True` the payload carries every branch
 * plus `current_leaf_message_uuid`; without it the list is already linear.
 */
export function parseConversation(id: string, raw: unknown): Conversation | null {
  if (!isRecord(raw) || !Array.isArray(raw['chat_messages'])) return null;
  const nodes: Node[] = [];
  for (const entry of raw['chat_messages']) {
    if (!isRecord(entry) || typeof entry['uuid'] !== 'string') continue;
    const parent = entry['parent_message_uuid'];
    nodes.push({
      id: entry['uuid'],
      parent: typeof parent === 'string' ? parent : null,
      message: entry,
    });
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const leaf =
    typeof raw['current_leaf_message_uuid'] === 'string' ? raw['current_leaf_message_uuid'] : null;
  let ordered: Node[];
  if (leaf && byId.has(leaf)) {
    ordered = [];
    const seen = new Set<string>();
    let cursor: string | null = leaf;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node = byId.get(cursor);
      if (!node) break;
      ordered.push(node);
      cursor = node.parent;
    }
    ordered.reverse();
  } else {
    ordered = nodes;
  }

  const messages: Message[] = [];
  for (const node of ordered) {
    const m = toMessage(node.message);
    if (m) messages.push(m);
  }

  const name = typeof raw['name'] === 'string' ? raw['name'].trim() : '';
  return {
    id,
    title: name === '' ? 'Untitled' : name,
    createdAt: toMs(raw['created_at']),
    updatedAt: toMs(raw['updated_at']),
    messages,
  };
}
