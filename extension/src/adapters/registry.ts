import type { VendorAdapter } from '@gaveta/shared';
import { ChatGPTAdapter } from './chatgpt/ChatGPTAdapter';
import { ClaudeAdapter } from './claude/ClaudeAdapter';
import { MockAdapter } from './mock/MockAdapter';

/**
 * Picks the adapter for the current page. The Mock adapter is only reachable
 * from the e2e build, whose manifest is the only one that matches localhost.
 */
export function resolveAdapter(url: string): VendorAdapter | null {
  const candidates: VendorAdapter[] = [new ChatGPTAdapter(), new ClaudeAdapter()];
  if (__GAVETA_E2E__) candidates.push(new MockAdapter());
  return candidates.find((a) => a.matches(url)) ?? null;
}
