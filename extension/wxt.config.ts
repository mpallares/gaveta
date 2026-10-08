import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import { contentMatches } from './src/hosts';

const isE2E = process.env.GAVETA_E2E === '1';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  imports: false,
  // Chrome refuses content scripts containing certain unicode sequences ("isn't UTF-8 encoded").
  experimental: { escapeUnicode: true },
  ...(isE2E ? { outDirTemplate: '{{browser}}-mv{{manifestVersion}}-e2e' } : {}),
  manifest: {
    name: 'Gaveta',
    description: 'Folders, full-text search and export for ChatGPT and Claude. Local-first.',
    permissions: ['storage'],
    host_permissions: contentMatches(isE2E),
  },
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      __GAVETA_E2E__: JSON.stringify(isE2E),
    },
  }),
});
