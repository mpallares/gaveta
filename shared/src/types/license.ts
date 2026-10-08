export type LicenseTier = 'free' | 'pro';

export interface LicenseState {
  tier: LicenseTier;
  /** Lemon Squeezy key as typed by the user. Not validated in Phase 1. */
  key: string | null;
  /** Epoch ms of the last validation attempt, null if never. */
  checkedAt: number | null;
}

export const DEFAULT_LICENSE_STATE: LicenseState = { tier: 'free', key: null, checkedAt: null };

export const FREE_FOLDER_LIMIT = 5;

export function folderLimit(tier: LicenseTier): number {
  return tier === 'pro' ? Number.POSITIVE_INFINITY : FREE_FOLDER_LIMIT;
}
