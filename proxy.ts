import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// Define paths that require authentication
const protectedPaths = ['/dashboard', '/profile', '/settings'];

// Define paths that should redirect to home if user is already authenticated
const authPaths = ['/login', '/signup'];

export default async function proxy(request: NextRequest) {
  console.log('🚀 ~ proxy ~ Start');
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // Check if the current path is an auth path
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // Verify token if it exists
  const user = authToken ? verifyToken(authToken) : null;

  // If access token is invalid but refresh token exists, try to refresh
  if (!user && refreshToken && isProtectedPath) {
    // Redirect to refresh endpoint which will set new cookies and redirect back
    const refreshUrl = new URL('/api/auth/refresh', request.url);
    refreshUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(refreshUrl);
  }

  // Redirect to login if trying to access protected route without valid tokens
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if trying to access auth pages while already authenticated
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Add user info to request headers for API routes
  if (user) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.userId);
    requestHeaders.set('x-user-email', user.email);
    // requestHeaders.set('x-user-name', user.name);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
