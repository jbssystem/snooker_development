import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isLocale } from './i18n/config';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const savedLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const pathLocale = request.nextUrl.pathname.split('/').filter(Boolean)[0];

  if (isLocale(savedLocale) && isLocale(pathLocale) && savedLocale !== pathLocale) {
    const url = request.nextUrl.clone();
    const segments = url.pathname.split('/').filter(Boolean);
    segments[0] = savedLocale;
    url.pathname = `/${segments.join('/')}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};