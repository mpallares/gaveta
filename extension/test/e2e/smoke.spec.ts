import { type Download } from '@playwright/test';
import { expect, test } from './extension';

/** Reads a blob download; also lets Chromium finish it so closing the context is instant. */
async function readDownload(download: Download): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

test('create folder → add chat → search → export', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/');

  const panel = page.getByTestId('panel');
  await expect(panel).toBeVisible();

  // Wait for the mock adapter to finish indexing.
  await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await expect(page.getByTestId('conversation-mock-0001')).toBeVisible();

  // Create a folder.
  await page.getByTestId('new-folder-button').click();
  await page.getByTestId('new-folder-input').fill('Cooking');
  await page.getByTestId('new-folder-input').press('Enter');
  const folder = page.locator('[data-folder-name="Cooking"]');
  await expect(folder).toBeVisible();

  // Drag a chat into the folder.
  await page.getByTestId('conversation-mock-0001').dragTo(folder.getByTestId('folder-select'));
  await expect(folder.getByTestId('folder-count')).toHaveText('1');

  // Folder view shows only that chat.
  await folder.getByTestId('folder-select').click();
  await expect(
    page.getByTestId('conversation-list').locator('li[data-conversation-key]'),
  ).toHaveCount(1);

  // Search by message content (the word "acetone" only appears in a message, not a title).
  await page.getByTestId('search-input').fill('acetone');
  const results = page.getByTestId('search-results');
  await expect(results.locator('li[data-conversation-key]')).toHaveCount(1);
  await expect(results.getByTestId('conversation-mock-0001')).toBeVisible();

  // Export as Markdown triggers a download.
  await results.getByTestId('export-button').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-markdown').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/sourdough-starter-troubleshooting\.md$/);
  const content = await readDownload(download);
  expect(content).toContain('# Sourdough starter troubleshooting');
  expect(content).toContain('acetone');
});

test('free tier blocks the sixth folder with an upgrade state', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });

  for (let i = 1; i <= 6; i += 1) {
    await page.getByTestId('new-folder-button').click();
    await page.getByTestId('new-folder-input').fill(`Folder ${i}`);
    await page.getByTestId('new-folder-input').press('Enter');
  }
  await expect(page.getByTestId('upgrade-state')).toBeVisible();
  await expect(page.getByTestId('folder-limit')).toHaveText('5/5');
});
