import { NextRequest, NextResponse } from 'next/server';
import { signToken, signRefreshToken } from '@/lib/jwt';
import { userOperations /* , sessionOperations  */ } from '@/lib/db';

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
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

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
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();
    console.log('🚀 ~ GET ~ userInfo:', userInfo);

    // Store or update user in database
    let user = userOperations.findByGoogleId(userInfo.id);

    if (!user) {
      // Check if user exists by email
      user = userOperations.findByEmail(userInfo.email);

      if (user) {
        // Update existing user with Google ID
        user = userOperations.update(user.id, {
          google_id: userInfo.id,
          name: userInfo.name,
          avatar_url: userInfo.picture,
        });
      } else {
        // Create new user
        user = userOperations.create({
          email: userInfo.email,
          name: userInfo.name,
          google_id: userInfo.id,
          avatar_url: userInfo.picture,
        });
      }
    } else {
      // Update existing user's info
      user = userOperations.update(user.id, {
        name: userInfo.name,
        avatar_url: userInfo.picture,
      });
    }

    console.log('User authenticated:', user);

    // Create JWT tokens with user information from database
    const accessToken = signToken({
      userId: user!.id.toString(),
      email: user!.email,
      name: user!.name || '',
      picture: user!.avatar_url || '',
    });

    const refreshToken = signRefreshToken({
      userId: user!.id.toString(),
      email: user!.email,
      name: user!.name || '',
      picture: user!.avatar_url || '',
    });

    // Store refresh token in database
    // const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000); // 7 days
    // sessionOperations.create({
    //   user_id: user!.id,
    //   token: refreshToken,
    //   expires_at: expiresAt,
    // });

    // Create a response with a redirect
    const response = NextResponse.redirect(new URL('/', request.url));

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
