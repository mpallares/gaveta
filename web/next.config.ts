import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    // The extension's background worker fetches /v1/config.json cross-origin.
    return [
      { source: '/v1/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
    ];
  },
};

export default nextConfig;
