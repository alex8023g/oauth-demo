import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token provided' },
      { status: 401 }
    );
  }

  // Verify the refresh token
  const payload = verifyRefreshToken(refreshToken);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 }
    );
  }

  // Generate new access token
  const newAccessToken = signToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });

  // Create response
  const response = NextResponse.json(
    { message: 'Token refreshed successfully' },
    { status: 200 }
  );

  // Set new access token cookie
  response.cookies.set('auth_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  });

  return response;
}

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const redirect = request.nextUrl.searchParams.get('redirect') || '/';

  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the refresh token
  const payload = verifyRefreshToken(refreshToken);

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Generate new access token
  const newAccessToken = signToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });

  // Create response with redirect
  const response = NextResponse.redirect(new URL(redirect, request.url));

  // Set new access token cookie
  response.cookies.set('auth_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  });

  return response;
}
