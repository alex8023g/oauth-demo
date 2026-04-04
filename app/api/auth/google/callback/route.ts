import { NextRequest, NextResponse } from 'next/server';
import { signToken, signRefreshToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI; // || 'http://localhost:3000/api/auth/google/callback';

  if (!redirectUri) {
    return NextResponse.json(
      { error: 'Google OAuth redirect URI is not configured' },
      { status: 500 },
    );
  }

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.redirect(new URL('/login?error=config_error', request.url));
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();
    console.log('🚀 ~ GET ~ userInfo:', googleUser);

    // Check if account exists for this Google ID
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: googleUser.id,
        },
      },
      include: { user: true },
    });

    let user;

    if (existingAccount) {
      // Update existing user's info
      user = await prisma.user.update({
        where: { id: existingAccount.userId },
        data: {
          name: googleUser.name,
          avatarUrl: googleUser.picture,
        },
      });

      // Update account tokens
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in
            ? Math.floor(Date.now() / 1000) + tokenData.expires_in
            : null,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
        },
      });
    } else {
      // Check if user exists by email
      user = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            avatarUrl: googleUser.picture,
          },
        });
      } else {
        // Update existing user's info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: googleUser.name,
            avatarUrl: googleUser.picture,
          },
        });
      }

      // Create new account
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerAccountId: googleUser.id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in
            ? Math.floor(Date.now() / 1000) + tokenData.expires_in
            : null,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
        },
      });
    }

    console.log('User authenticated:', user);

    // Create JWT tokens with user information from database
    const accessToken = signToken({
      userId: user.id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.avatarUrl || '',
    });

    const refreshToken = signRefreshToken({
      userId: user.id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.avatarUrl || '',
    });

    // Create a response with a redirect
    const response = NextResponse.redirect(
      new URL('/dashboard', process.env.NEXT_PUBLIC_HOST),
    );

    // Set access token as an httpOnly cookie (short-lived)
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Set refresh token as an httpOnly cookie (long-lived)
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
