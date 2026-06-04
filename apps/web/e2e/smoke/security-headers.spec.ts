import { test, expect } from '../support/test-base';

/**
 * The app stores a short-lived access token in localStorage, so the browser-side
 * security posture matters. Assert the hardening response headers are present on
 * app responses (configured in next.config.ts → securityHeaders).
 */

test.describe('security response headers', () => {
  test.use({ auth: false });

  test('app responses carry CSP and anti-clickjacking headers', async ({ page }) => {
    const response = await page.goto('/en/login');
    expect(response, 'navigation response').not.toBeNull();
    const headers = response!.headers();

    const csp = headers['content-security-policy'];
    expect(csp, 'CSP header present').toBeTruthy();
    // Clickjacking + exfiltration controls must be in the policy.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('connect-src');

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('geolocation=()');
  });
});
