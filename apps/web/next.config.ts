import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const workspaceRoot = path.resolve(process.cwd(), '../..');
const standaloneOutput = process.env.NEXT_STANDALONE === 'true';

const nextConfig: NextConfig = {
  ...(standaloneOutput ? { output: 'standalone' as const, outputFileTracingRoot: workspaceRoot } : {}),
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ['@snooker/shared', '@snooker/snooker-domain', '@snooker/ui', 'konva', 'react-konva'],
  async rewrites() {
    return [{ source: '/icon.png', destination: '/icon-192.png' }];
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
