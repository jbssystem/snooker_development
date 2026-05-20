import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ['@snooker/shared', '@snooker/snooker-domain', '@snooker/ui'],
};

export default withNextIntl(nextConfig);
