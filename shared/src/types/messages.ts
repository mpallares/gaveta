import type { Conversation } from './conversation';
import type { LicenseState } from './license';
import type { RemoteConfig } from './remoteConfig';
import type { VendorId } from './vendor';

export type ExportFormat = 'markdown' | 'json';

export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

/** Request → response pairs for runtime messaging between content script / popup and the background. */
export interface MessageMap {
  'remoteConfig:get': { request: Record<string, never>; response: RemoteConfig };
  'license:get': { request: Record<string, never>; response: LicenseState };
  'license:setKey': { request: { key: string | null }; response: LicenseState };
  'export:conversation': {
    request: { vendorId: VendorId; format: ExportFormat; conversation: Conversation };
    response: ExportFile;
  };
}

export type MessageType = keyof MessageMap;

export type MessageRequest<T extends MessageType> = { type: T } & MessageMap[T]['request'];
export type MessageResponse<T extends MessageType> =
  { ok: true; value: MessageMap[T]['response'] } | { ok: false; error: string };
