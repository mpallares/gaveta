import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { buildExport } from '@/lib/export';
import { getLicenseState, setLicenseKey } from '@/lib/license';
import { log } from '@/lib/log';
import { listenInBackground } from '@/lib/messaging';
import { getRemoteConfig } from '@/lib/remoteConfig';

/**
 * Background service worker: license state, remote-config cache, export jobs.
 * It never sees vendor endpoints and never logs chat content.
 */
export default defineBackground(() => {
  listenInBackground({
    'remoteConfig:get': () => getRemoteConfig(),
    'license:get': () => getLicenseState(),
    'license:setKey': (req) => setLicenseKey(req.key),
    'export:conversation': async (req) => buildExport(req.conversation, req.vendorId, req.format),
  });

  browser.runtime.onInstalled.addListener(() => {
    log.info('background', 'installed');
    void getRemoteConfig({ force: true });
  });

  void getRemoteConfig();
});
