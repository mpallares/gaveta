import {
  DEFAULT_REMOTE_CONFIG,
  parseRemoteConfig,
  REMOTE_CONFIG_URL,
  type RemoteConfig,
} from '@gaveta/shared';
import { browser } from 'wxt/browser';
import { errorKind, log } from './log';

const CACHE_KEY = 'remoteConfigCache';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

interface CacheEntry {
  config: RemoteConfig;
  fetchedAt: number;
}

async function readCache(): Promise<CacheEntry | null> {
  const stored = await browser.storage.local.get(CACHE_KEY);
  const entry = stored[CACHE_KEY] as Partial<CacheEntry> | undefined;
  if (!entry || typeof entry.fetchedAt !== 'number') return null;
  const config = parseRemoteConfig(entry.config);
  return config ? { config, fetchedAt: entry.fetchedAt } : null;
}

async function fetchRemote(url: string, fetchImpl: typeof fetch): Promise<RemoteConfig | null> {
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const parsed = parseRemoteConfig(await res.json());
    if (!parsed) log.warn('remoteConfig', 'invalid-shape');
    return parsed;
  } catch (e) {
    log.warn('remoteConfig', 'fetch-failed', { kind: errorKind(e) });
    return null;
  }
}

/**
 * Cached remote config: served from storage when fresh, refreshed otherwise,
 * and falling back to the bundled default when the network is unavailable.
 */
export async function getRemoteConfig(
  opts: { force?: boolean; url?: string; fetchImpl?: typeof fetch } = {},
): Promise<RemoteConfig> {
  const cached = await readCache();
  if (cached && !opts.force && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached.config;

  const fresh = await fetchRemote(opts.url ?? REMOTE_CONFIG_URL, opts.fetchImpl ?? fetch);
  if (fresh) {
    const entry: CacheEntry = { config: fresh, fetchedAt: Date.now() };
    await browser.storage.local.set({ [CACHE_KEY]: entry });
    return fresh;
  }
  return cached?.config ?? DEFAULT_REMOTE_CONFIG;
}
