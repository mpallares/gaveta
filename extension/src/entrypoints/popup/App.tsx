import { useEffect, useState } from 'react';
import {
  DEFAULT_LICENSE_STATE,
  DEFAULT_REMOTE_CONFIG,
  type LicenseState,
  type RemoteConfig,
} from '@gaveta/shared';
import { browser } from 'wxt/browser';
import { sendToBackground } from '@/lib/messaging';

export function App() {
  const [license, setLicense] = useState<LicenseState>(DEFAULT_LICENSE_STATE);
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_REMOTE_CONFIG);
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    void sendToBackground('license:get', {}).then((l) => {
      setLicense(l);
      setKey(l.key ?? '');
    });
    void sendToBackground('remoteConfig:get', {}).then(setConfig);
  }, []);

  const save = async (): Promise<void> => {
    const next = await sendToBackground('license:setKey', { key });
    setLicense(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <main className="flex flex-col gap-3 p-4 text-sm">
      <header className="flex items-baseline justify-between">
        <h1 className="text-base font-semibold">Gaveta</h1>
        <span className="text-xs text-gray-500">v{version}</span>
      </header>

      {config.notice && (
        <p className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">{config.notice}</p>
      )}

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Plan</h2>
        <p data-testid="tier">
          {license.tier === 'pro' ? 'Pro' : 'Free'}{' '}
          <span className="text-xs text-gray-500">(5 folders on Free)</span>
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <label
          htmlFor="license-key"
          className="text-xs font-semibold tracking-wide text-gray-500 uppercase"
        >
          License key
        </label>
        <input
          id="license-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="button"
          onClick={() => void save()}
          className="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700"
        >
          {saved ? 'Saved' : 'Save key'}
        </button>
        <p className="text-xs text-gray-500">
          Validation arrives in a later release. The key is stored only in your browser profile.
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Sites</h2>
        <ul className="text-xs">
          <li>ChatGPT: {config.adapters.chatgpt.enabled ? 'enabled' : 'disabled'}</li>
          <li>Claude: {config.adapters.claude.enabled ? 'enabled' : 'disabled'}</li>
        </ul>
      </section>

      <p className="text-xs text-gray-500">
        Open chatgpt.com or claude.ai to see the Gaveta panel on the right edge.
      </p>
    </main>
  );
}
