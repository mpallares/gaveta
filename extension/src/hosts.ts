/** The only hosts the extension ever touches. Localhost exists solely in the e2e build. */
export const PROD_HOSTS = ['https://chatgpt.com/*', 'https://claude.ai/*'] as const;
export const E2E_HOSTS = ['http://127.0.0.1:4173/*'] as const;

export function contentMatches(e2e: boolean): string[] {
  return e2e ? [...PROD_HOSTS, ...E2E_HOSTS] : [...PROD_HOSTS];
}
