import { browser } from 'wxt/browser';

const KEY = 'panelOpen';

export async function readPanelOpen(): Promise<boolean> {
  const stored = await browser.storage.local.get(KEY);
  return stored[KEY] !== false;
}

export async function writePanelOpen(open: boolean): Promise<void> {
  await browser.storage.local.set({ [KEY]: open });
}
