import { NextRequest, NextResponse } from 'next/server';
import { signToken, signRefreshToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
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

  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';

  if (!githubClientId || !githubClientSecret) {
    return NextResponse.redirect(new URL('/login?error=config_error', request.url));
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: githubClientId,
        client_secret: githubClientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: GitHubTokenResponse = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // Get user info from GitHub
    const userInfoResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const githubUser: GitHubUserInfo = await userInfoResponse.json();
    console.log('🚀 ~ GET ~ githubUser:', githubUser);

    // Get user's primary email if not public
    let userEmail = githubUser.email;
    if (!userEmail) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails: GitHubEmail[] = await emailsResponse.json();
        console.log('🚀 ~ GET ~ emails:', emails);
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        userEmail = primaryEmail?.email || emails[0]?.email || null;
      }
    }

    if (!userEmail) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // Check if account exists for this GitHub ID
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'github',
          providerAccountId: githubUser.id.toString(),
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
          name: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
        },
      });

      // Update account tokens
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenData.access_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
        },
      });
    } else {
      // Check if user exists by email
      user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: userEmail,
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
          },
        });
      } else {
        // Update existing user's info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
          },
        });
      }

      // Create new account
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: 'github',
          providerAccountId: githubUser.id.toString(),
          accessToken: tokenData.access_token,
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
