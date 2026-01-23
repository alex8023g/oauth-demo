import { NextResponse } from 'next/server';

export async function GET() {
  const appleClientId = process.env.APPLE_CLIENT_ID;
  const redirectUri =
    process.env.APPLE_REDIRECT_URI ;

  if (!appleClientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Apple OAuth is not configured' },
      { status: 500 }
    );
  }

  const rootUrl = 'https://appleid.apple.com/auth/authorize';

  const options = {
    client_id: appleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
  };

  const qs = new URLSearchParams(options);
  const authUrl = `${rootUrl}?${qs.toString()}`;

  return NextResponse.redirect(authUrl);
}
