import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;
const ROOT_ROUTES = new Set([
  'reels',
  'opportunities',
  'add-project',
  'login',
  'register',
  'onboarding',
  'dashboard',
  'verification',
  'messages',
  'packages',
  'suggested',
  'profile',
  'projects',
  'sectors',
  'investors',
  'companies',
  'about',
  'privacy',
  'terms',
  'promote',
  'project',
  'auth',
  'map',
  'compare',
  'payment',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // دعم روابط قديمة مثل /ar/reels أو /en/opportunities وتحويلها للمسار الجديد /om/ar/...
  const langOnlyMatch = pathname.match(/^\/(ar|en)(\/.*)?$/);
  if (langOnlyMatch) {
    const lang = langOnlyMatch[1];
    const rest = langOnlyMatch[2] || '';
    const url = request.nextUrl.clone();
    url.pathname = `/om/${lang}${rest}`;
    return NextResponse.redirect(url);
  }

  // دعم روابط مختصرة مثل /reels أو /opportunities
  const first = pathname.split('/').filter(Boolean)[0];
  if (first && ROOT_ROUTES.has(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/om/ar${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
