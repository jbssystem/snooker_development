import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const workspaceRoot = path.resolve(process.cwd(), '../..');
const standaloneOutput = process.env.NEXT_STANDALONE === 'true';
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Security response headers for the whole app. The app keeps a short-lived
 * access token in localStorage, so the browser-side posture (clickjacking +
 * XSS) directly affects player-data safety:
 *  - CSP restricts where scripts load from and — via connect-src — where the
 *    page may exfiltrate data to, shrinking the XSS blast radius. ('unsafe-inline'
 *    is required for Next's inline bootstrap/styles; dev also needs 'unsafe-eval'
 *    + ws: for React Fast Refresh.)
 *  - frame-ancestors / X-Frame-Options block clickjacking of the authed UI.
 *  - Referrer-Policy stops the email-verification token (carried in the URL)
 *    leaking to third parties via the Referer header.
 * In production the API is same-origin (`/api` via nginx), so `connect-src 'self'`
 * already covers it; only local dev talks to a cross-origin API.
 */
function securityHeaders() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const apiOrigin = apiUrl.startsWith('http') ? new URL(apiUrl).origin : '';
  const connectSrc = ["'self'", apiOrigin, isDev ? 'ws: wss:' : ''].filter(Boolean).join(' ');
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    `connect-src ${connectSrc}`,
  ].join('; ');

  const headers = [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
  if (!isDev) {
    headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
  }
  return headers;
}

const nextConfig: NextConfig = {
  ...(standaloneOutput ? { output: 'standalone' as const, outputFileTracingRoot: workspaceRoot } : {}),
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ['@snooker/shared', '@snooker/snooker-domain', '@snooker/ui', 'konva', 'react-konva'],
  async rewrites() {
    return [{ source: '/icon.png', destination: '/icon-192.png' }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
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
