import { NextResponse } from 'next/server';

export async function GET() {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  console.log('🚀 ~ GET ~ githubClientId:', githubClientId);
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';
  console.log('🚀 ~ GET ~ redirectUri:', redirectUri);

  if (!githubClientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured' },
      { status: 500 }
    );
  }

  const rootUrl = 'https://github.com/login/oauth/authorize';

  const options = {
    redirect_uri: redirectUri,
    client_id: githubClientId,
    scope: 'user:email',
  };

  const qs = new URLSearchParams(options);
  console.log('🚀 ~ GET ~ qs:', qs);
  const authUrl = `${rootUrl}?${qs.toString()}`;

  return NextResponse.redirect(authUrl);
}
