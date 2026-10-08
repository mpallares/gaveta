import type { MessageMap, MessageRequest, MessageResponse, MessageType } from '@gaveta/shared';
import { browser } from 'wxt/browser';

/** Typed request to the background. Throws on transport or handler error. */
export async function sendToBackground<T extends MessageType>(
  type: T,
  request: MessageMap[T]['request'],
): Promise<MessageMap[T]['response']> {
  const payload = { type, ...request } as MessageRequest<T>;
  const response = (await browser.runtime.sendMessage(payload)) as MessageResponse<T> | undefined;
  if (!response) throw new Error(`No response for ${type}`);
  if (!response.ok) throw new Error(response.error);
  return response.value;
}

export type Handlers = {
  [T in MessageType]: (request: MessageRequest<T>) => Promise<MessageMap[T]['response']>;
};

function isMessage(value: unknown): value is MessageRequest<MessageType> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/** Installs a single `onMessage` listener that dispatches by `type`. */
export function listenInBackground(handlers: Handlers): void {
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isMessage(message)) return false;
    const handler = handlers[message.type] as
      ((req: MessageRequest<MessageType>) => Promise<unknown>) | undefined;
    if (!handler) {
      sendResponse({ ok: false, error: `Unknown message type ${message.type}` });
      return false;
    }
    handler(message)
      .then((value) => sendResponse({ ok: true, value }))
      .catch((e: unknown) =>
        sendResponse({ ok: false, error: e instanceof Error ? e.name : 'error' }),
      );
    return true; // keep the channel open for the async response
  });
}
