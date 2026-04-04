import { NextResponse } from 'next/server';

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI; // || 'http://localhost:3000/api/auth/google/callback';

  if (!redirectUri) {
    return NextResponse.json(
      { error: 'Google OAuth redirect URI is not configured' },
      { status: 500 },
    );
  }

  if (!googleClientId) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured' },
      { status: 500 },
    );
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

  const options = {
    redirect_uri: redirectUri,
    client_id: googleClientId,
    access_type: 'offline',
    response_type: 'code',
    // prompt: 'consent', // every time ask for consent
    scope: ['openid', 'email', 'profile'].join(' '),
  };

  const qs = new URLSearchParams(options);
  const authUrl = `${rootUrl}?${qs.toString()}`;

  return NextResponse.redirect(authUrl);
}
