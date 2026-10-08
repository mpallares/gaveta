import { DEFAULT_LICENSE_STATE, type LicenseState } from '@gaveta/shared';
import { browser } from 'wxt/browser';

const KEY = 'license';

/** License state lives in `chrome.storage.sync` (tiny, follows the user's profile). */
export async function getLicenseState(): Promise<LicenseState> {
  const stored = await browser.storage.sync.get(KEY);
  const raw = stored[KEY] as Partial<LicenseState> | undefined;
  if (!raw) return DEFAULT_LICENSE_STATE;
  return {
    tier: raw.tier === 'pro' ? 'pro' : 'free',
    key: typeof raw.key === 'string' ? raw.key : null,
    checkedAt: typeof raw.checkedAt === 'number' ? raw.checkedAt : null,
  };
}

/** Phase 1: stores the key only. Validation against Lemon Squeezy is a Phase 2 TODO. */
export async function setLicenseKey(key: string | null): Promise<LicenseState> {
  const current = await getLicenseState();
  const trimmed = key?.trim() ?? '';
  const next: LicenseState = { ...current, key: trimmed === '' ? null : trimmed };
  await browser.storage.sync.set({ [KEY]: next });
  return next;
}
