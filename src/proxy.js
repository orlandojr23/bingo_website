import { NextResponse } from 'next/server';

// DEV BYPASS: Disable all admin route cookie redirects to allow offline local navigation
export function proxy(request) {
  return NextResponse.next();
}

export const config = {
  // Match nothing to bypass proxy checks
  matcher: [],
};
