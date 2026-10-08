import type { Conversation, ConversationSummary, Message, MessageRole } from '@gaveta/shared';

/**
 * Pure parsers for ChatGPT API payloads. They accept `unknown` and return null
 * when the shape is not what we expect, so callers can report "needs update".
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function secondsToMs(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 1000);
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export function parseAccessToken(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  const token = raw['accessToken'];
  return typeof token === 'string' && token !== '' ? token : null;
}

export interface ConversationsPage {
  items: ConversationSummary[];
  total: number;
}

export function parseConversationsPage(raw: unknown): ConversationsPage | null {
  if (!isRecord(raw) || !Array.isArray(raw['items'])) return null;
  const items: ConversationSummary[] = [];
  for (const entry of raw['items']) {
    if (!isRecord(entry) || typeof entry['id'] !== 'string') continue;
    items.push({
      id: entry['id'],
      title: typeof entry['title'] === 'string' ? entry['title'] : 'Untitled',
      createdAt: secondsToMs(entry['create_time']),
      updatedAt: secondsToMs(entry['update_time']),
    });
  }
  const total = typeof raw['total'] === 'number' ? raw['total'] : items.length;
  return { items, total };
}

const ROLES: readonly MessageRole[] = ['user', 'assistant', 'system', 'tool'];

function toRole(v: unknown): MessageRole | null {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
    ? (v as MessageRole)
    : null;
}

interface MappingNode {
  id: string;
  parent: string | null;
  message: Record<string, unknown> | null;
}

function readNode(id: string, raw: unknown): MappingNode | null {
  if (!isRecord(raw)) return null;
  const parent = raw['parent'];
  const message = raw['message'];
  return {
    id,
    parent: typeof parent === 'string' ? parent : null,
    message: isRecord(message) ? message : null,
  };
}

/** Extracts visible text from a `message.content` object. Returns '' when there is nothing to show. */
function messageText(content: unknown): string {
  if (!isRecord(content)) return '';
  const type = content['content_type'];
  if (type === 'text' || type === 'multimodal_text') {
    const parts = content['parts'];
    if (!Array.isArray(parts)) return '';
    return parts
      .filter((p): p is string => typeof p === 'string')
      .join('\n')
      .trim();
  }
  if (type === 'code' && typeof content['text'] === 'string') {
    return `\`\`\`\n${content['text']}\n\`\`\``;
  }
  return '';
}

function toMessage(message: Record<string, unknown>): Message | null {
  const author = message['author'];
  const role = isRecord(author) ? toRole(author['role']) : null;
  if (role === null || role === 'system') return null;
  const metadata = message['metadata'];
  if (isRecord(metadata) && metadata['is_visually_hidden_from_conversation'] === true) return null;
  const text = messageText(message['content']);
  if (text === '') return null;
  const ts = secondsToMs(message['create_time']);
  return { role, text, ts: ts || null };
}

/** Walks `mapping` from `current_node` to the root to get the active branch, in order. */
export function parseConversation(id: string, raw: unknown): Conversation | null {
  if (!isRecord(raw) || !isRecord(raw['mapping'])) return null;
  const mapping = raw['mapping'];
  const nodes = new Map<string, MappingNode>();
  for (const [nodeId, value] of Object.entries(mapping)) {
    const node = readNode(nodeId, value);
    if (node) nodes.set(nodeId, node);
  }
  if (nodes.size === 0) return null;

  let cursor = typeof raw['current_node'] === 'string' ? raw['current_node'] : findLeaf(nodes);
  const chain: MappingNode[] = [];
  const seen = new Set<string>();
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    const node = nodes.get(cursor);
    if (!node) break;
    chain.push(node);
    cursor = node.parent;
  }
  chain.reverse();

  const messages: Message[] = [];
  for (const node of chain) {
    if (!node.message) continue;
    const m = toMessage(node.message);
    if (m) messages.push(m);
  }

  return {
    id,
    title: typeof raw['title'] === 'string' ? raw['title'] : 'Untitled',
    createdAt: secondsToMs(raw['create_time']),
    updatedAt: secondsToMs(raw['update_time']),
    messages,
  };
}

/** When `current_node` is absent, pick a node that nobody lists as a parent. */
function findLeaf(nodes: Map<string, MappingNode>): string | null {
  const parents = new Set<string>();
  for (const n of nodes.values()) if (n.parent) parents.add(n.parent);
  for (const id of nodes.keys()) if (!parents.has(id)) return id;
  return null;
}
