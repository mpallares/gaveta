import { defineConfig } from '@playwright/test';

export const FIXTURE_PORT = 4173;
export const FIXTURE_URL = `http://127.0.0.1:${FIXTURE_PORT}`;

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: FIXTURE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node test/e2e/serve-fixture.mjs ${FIXTURE_PORT}`,
    url: FIXTURE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
