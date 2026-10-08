import { createRoot, type Root } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { resolveAdapter } from '@/adapters/registry';
import type { VendorAdapter } from '@gaveta/shared';
import { contentMatches } from '@/hosts';
import { downloadFile } from '@/lib/export/download';
import { log } from '@/lib/log';
import { sendToBackground } from '@/lib/messaging';
import { readPanelOpen, writePanelOpen } from '@/lib/panelState';
import { createGavetaStore } from '@/store/gavetaStore';
import { StoreProvider } from '@/store/context';
import { Panel } from '@/ui/Panel';
import './style.css';

export default defineContentScript({
  matches: contentMatches(__GAVETA_E2E__),
  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    const adapter = resolveAdapter(location.href);
    if (!adapter) {
      log.info('content', 'no-adapter');
      return;
    }

    const store = createGavetaStore({
      adapter,
      getLicense: () => sendToBackground('license:get', {}),
      getRemoteConfig: () => sendToBackground('remoteConfig:get', {}),
      buildExport: (conversation, format) =>
        sendToBackground('export:conversation', { vendorId: adapter.id, format, conversation }),
      download: downloadFile,
      readPanelOpen,
      writePanelOpen,
    });

    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'gaveta-panel',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      isolateEvents: true,
      onMount(container, _shadow, host) {
        syncTheme(host, adapter);
        const root = createRoot(container);
        root.render(
          <StoreProvider value={store}>
            <Panel
              vendorName={adapter.displayName}
              conversationUrl={(id) => adapter.conversationUrl(id)}
            />
          </StoreProvider>,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();

    const themeObserver = new MutationObserver(() => syncTheme(ui.shadowHost, adapter));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    ctx.onInvalidated(() => themeObserver.disconnect());

    await store.getState().init();

    const stop = adapter.observeNavigation(() => {
      void store.getState().sync();
    });
    ctx.onInvalidated(stop);
  },
});

/** Mirrors the vendor app's explicit theme onto the shadow host; the adapter knows how to read it. */
function syncTheme(host: HTMLElement, adapter: VendorAdapter): void {
  const theme = adapter.getColorScheme();
  if (theme) host.setAttribute('data-theme', theme);
  else host.removeAttribute('data-theme');
}
