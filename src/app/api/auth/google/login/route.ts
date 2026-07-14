import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const origin = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const redirectUri = `${protocol}://${origin}/api/auth/google/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID is not configured in environment variables' },
      { status: 500 }
    );
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'openid',
    'email',
    'profile'
  ].join(' ');

  // Pass current origin in state so the callback knows where to redirect
  const state = Buffer.from(JSON.stringify({ origin: `${protocol}://${origin}` })).toString('base64');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}`;

  return NextResponse.redirect(authUrl);
}
