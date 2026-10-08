/** Role of a single message in a chat. `tool` covers tool/function outputs. */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  role: MessageRole;
  /** Plain text content. Never log this. */
  text: string;
  /** Epoch milliseconds, or null when the vendor does not expose it. */
  ts: number | null;
}

/** Lightweight description of a chat, enough to list and detect staleness. */
export interface ConversationSummary {
  /** Vendor-scoped id (the id the vendor itself uses). */
  id: string;
  title: string;
  /** Epoch milliseconds. 0 when unknown (e.g. DOM fallback). */
  createdAt: number;
  /** Epoch milliseconds. 0 when unknown. */
  updatedAt: number;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}
