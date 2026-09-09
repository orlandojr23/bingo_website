import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const cookies = request.cookies;

  // Check if any auth cookie or session token is present
  const hasAuthCookie = cookies.getAll().some(
    (c) => c.name.startsWith('sb-') || c.name.includes('auth') || c.name.includes('session')
  );

  // 1. Protect Driver Routes (/driver)
  if (pathname.startsWith('/driver')) {
    if (!hasAuthCookie) {
      const loginUrl = new URL('/driver-login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Protect Resident Action Routes (/report)
  if (pathname.startsWith('/report')) {
    if (!hasAuthCookie) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect Admin Portal Routes (/dispatch, /dashboard, /analytics, /staff, /tickets, /crud)
  const isAdminRoute = [
    '/dispatch',
    '/dashboard',
    '/analytics',
    '/staff',
    '/tickets',
    '/crud',
  ].some((route) => pathname.startsWith(route));

  if (isAdminRoute) {
    if (!hasAuthCookie) {
      const adminLoginUrl = new URL('/admin-login', request.url);
      return NextResponse.redirect(adminLoginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/driver/:path*',
    '/report/:path*',
    '/dispatch/:path*',
    '/dashboard/:path*',
    '/analytics/:path*',
    '/staff/:path*',
    '/tickets/:path*',
    '/crud/:path*',
  ],
};
