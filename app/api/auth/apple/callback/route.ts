import { NextRequest, NextResponse } from 'next/server';
import { signToken, signRefreshToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import * as jwt from 'jsonwebtoken';

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // Unique user identifier
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  real_user_status?: number;
}

interface AppleUserInfo {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
}

const host = process.env.NEXT_PUBLIC_HOST;
if (!host) {
  throw new Error('NEXT_PUBLIC_HOST is not set');
}

function generateAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !clientId || !keyId || !privateKey) {
    throw new Error('Missing Apple OAuth configuration');
  }

  // Replace escaped newlines with actual newlines
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 86400 * 180, // 6 months max
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  return jwt.sign(payload, formattedPrivateKey, {
    algorithm: 'ES256',
    keyid: keyId,
  });
}

// Apple sends the callback as a form POST
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get('code') as string | null;
  const error = formData.get('error') as string | null;
  const userDataString = formData.get('user') as string | null;

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const appleClientId = process.env.APPLE_CLIENT_ID;
  const redirectUri =
    process.env.APPLE_REDIRECT_URI || 'http://localhost:3000/api/auth/apple/callback';

  if (!appleClientId) {
    return NextResponse.redirect(new URL('/login?error=config_error', request.url));
  }

  try {
    // Generate client secret JWT
    const clientSecret = generateAppleClientSecret();

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: appleClientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Apple token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: AppleTokenResponse = await tokenResponse.json();

    // Decode the id_token to get user info (Apple doesn't have a separate userinfo endpoint)
    const idTokenPayload = jwt.decode(tokenData.id_token) as AppleIdTokenPayload;

    if (!idTokenPayload || !idTokenPayload.sub) {
      throw new Error('Invalid id_token received from Apple');
    }

    // Parse user data if provided (only sent on first authorization)
    let userData: AppleUserInfo | null = null;
    if (userDataString) {
      try {
        userData = JSON.parse(userDataString);
      } catch {
        console.error('Failed to parse Apple user data');
      }
    }

    const appleUserId = idTokenPayload.sub;
    const email = idTokenPayload.email || userData?.email;
    const firstName = userData?.name?.firstName;
    const lastName = userData?.name?.lastName;
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    console.log('Apple user:', { appleUserId, email, fullName });

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // Check if account exists for this Apple ID
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'apple',
          providerAccountId: appleUserId,
        },
      },
      include: { user: true },
    });

    let user;

    if (existingAccount) {
      // Update existing user's info (only if we have new name data)
      user = await prisma.user.update({
        where: { id: existingAccount.userId },
        data: {
          ...(fullName && { name: fullName }),
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
        },
      });
    } else {
      // Check if user exists by email
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            name: fullName,
          },
        });
      } else if (fullName) {
        // Update existing user's name if we have it
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: fullName },
        });
      }

      // Create new account
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: 'apple',
          providerAccountId: appleUserId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in
            ? Math.floor(Date.now() / 1000) + tokenData.expires_in
            : null,
          tokenType: tokenData.token_type,
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
    console.error('Apple OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
