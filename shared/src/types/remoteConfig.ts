import { VENDOR_IDS, type VendorId } from './vendor';

export interface AdapterFlags {
  enabled: boolean;
}

/** Static JSON served at https://config.gaveta.app/v1/config.json. Configuration only, never code. */
export interface RemoteConfig {
  version: number;
  adapters: Record<VendorId, AdapterFlags>;
  notice?: string;
}

export const REMOTE_CONFIG_URL = 'https://config.gaveta.app/v1/config.json';

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  version: 1,
  adapters: {
    chatgpt: { enabled: true },
    claude: { enabled: true },
    gemini: { enabled: false },
    grok: { enabled: false },
    mock: { enabled: true },
  },
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Validates untrusted JSON. Unknown adapters are ignored; missing ones fall back to defaults. */
export function parseRemoteConfig(raw: unknown): RemoteConfig | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.version !== 'number') return null;
  if (!isRecord(raw.adapters)) return null;
  const adapters = { ...DEFAULT_REMOTE_CONFIG.adapters };
  for (const id of VENDOR_IDS) {
    const flags = raw.adapters[id];
    if (isRecord(flags) && typeof flags.enabled === 'boolean') {
      adapters[id] = { enabled: flags.enabled };
    }
  }
  const config: RemoteConfig = { version: raw.version, adapters };
  if (typeof raw.notice === 'string' && raw.notice.trim() !== '') {
    config.notice = raw.notice.slice(0, 500);
  }
  return config;
}
