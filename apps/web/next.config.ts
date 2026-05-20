import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@snooker/shared', '@snooker/snooker-domain', '@snooker/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);
