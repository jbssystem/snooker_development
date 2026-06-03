import type { Page, Route } from '@playwright/test';
import * as fx from './fixtures';

/**
 * Intercepts every request to the API host (default http://localhost:4000)
 * and answers with static fixtures, so smoke tests need no real backend.
 *
 * Routing is matched on `METHOD pathname`. Anything not listed falls back to
 * an empty body of a sensible shape so a page never crashes on a missing mock.
 */

type Handler = unknown | ((route: Route, url: URL) => unknown);

// Exact `METHOD /path` matches (highest priority).
const exact: Record<string, Handler> = {
  'GET /auth/me': fx.adminUser,
  'POST /auth/refresh': fx.authTokens,
  'GET /players/me/profile': fx.playerProfile,
  'GET /players/me/equipment-profiles': fx.equipment,
  'GET /players/me/dashboard': fx.dashboard,
  'GET /drill-templates': fx.drillTemplates,
  'GET /training-sessions': fx.trainingSessions,
  'GET /matches': fx.matches,
  'GET /calendar-events': fx.calendarEvents,
  'GET /lifestyle-factors': fx.lifestyleFactors,
  'GET /supplement-events': fx.supplementEvents,
  'GET /ai/reports': fx.aiReports,
  'GET /external-links': fx.externalLinks,
  'GET /external-links/imported-matches': fx.importedMatches,
  'GET /announcements/active': fx.activeAnnouncements,
  'GET /admin/stats': fx.adminStats,
  'GET /admin/announcements': fx.adminAnnouncements,
  'GET /admin/drill-templates': fx.adminDrills,
};

// Prefix matches for parameterised paths (e.g. /admin/users?search=...).
const prefixes: Array<{ method: string; prefix: string; body: Handler }> = [
  { method: 'GET', prefix: '/admin/users', body: fx.adminUserList },
];

function resolve(method: string, pathname: string): Handler | undefined {
  const key = `${method} ${pathname}`;
  if (key in exact) return exact[key];
  for (const p of prefixes) {
    if (method === p.method && pathname.startsWith(p.prefix)) return p.body;
  }
  return undefined;
}

export async function mockApi(page: Page, apiBase = 'http://localhost:4000'): Promise<void> {
  await page.route(`${apiBase}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const reqHeaders = request.headers();

    // The API client sends `credentials: 'include'`, so CORS headers must echo
    // the real origin (wildcard '*' is rejected for credentialed requests).
    const origin = reqHeaders['origin'] || 'http://localhost:3000';
    const corsHeaders: Record<string, string> = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
    };

    // Preflight.
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'access-control-allow-headers':
            reqHeaders['access-control-request-headers'] || 'authorization,content-type',
        },
        body: '',
      });
      return;
    }

    const matched = resolve(method, url.pathname);
    let body: unknown;
    if (matched !== undefined) {
      body = typeof matched === 'function' ? (matched as (r: Route, u: URL) => unknown)(route, url) : matched;
    } else if (method === 'GET') {
      // Unknown GET: default to an empty list — covers most "list" endpoints.
      body = [];
    } else {
      // Unknown write: echo an empty object.
      body = {};
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(body),
    });
  });
}
