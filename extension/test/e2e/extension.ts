import { chromium, test as base, type BrowserContext } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../../.output/chrome-mv3-e2e', import.meta.url));

/** Playwright fixture that boots Chromium with the unpacked e2e build loaded. */
export const test = base.extend<{ context: BrowserContext }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!existsSync(join(extensionPath, 'manifest.json'))) {
      throw new Error(`Extension build missing at ${extensionPath}. Run \`pnpm build:e2e\` first.`);
    }
    const userDataDir = await mkdtemp(join(tmpdir(), 'gaveta-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
});

export const expect = test.expect;
