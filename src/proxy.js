import { NextResponse } from 'next/server';

// These are the admin routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/crud',
  '/live-map',
  '/tickets',
  '/analytics',
  '/notifications',
  '/settings',
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for the admin_session cookie
    const session = request.cookies.get('admin_session');

    // If there is no session, redirect to the login page
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on matched paths to optimize performance
  matcher: [
    '/dashboard/:path*',
    '/crud/:path*',
    '/live-map/:path*',
    '/tickets/:path*',
    '/analytics/:path*',
    '/notifications/:path*',
    '/settings/:path*',
  ],
};
