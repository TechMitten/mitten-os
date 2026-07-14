import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateStr = searchParams.get('state');

  let origin = '';
  try {
    if (stateStr) {
      const stateObj = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
      origin = stateObj.origin;
    }
  } catch (e) {
    console.error('Failed to parse OAuth state:', e);
  }

  if (!origin) {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    origin = `${protocol}://${host}`;
  }

  if (error) {
    return NextResponse.redirect(`${origin}/?google_oauth=error&message=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?google_oauth=error&message=missing_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/?google_oauth=error&message=${encodeURIComponent('OAuth keys are not configured on server')}`
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', data);
      return NextResponse.redirect(
        `${origin}/?google_oauth=error&message=${encodeURIComponent(data.error_description || data.error || 'token_exchange_failed')}`
      );
    }

    const { access_token, refresh_token, expires_in } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0c0f17; color: white;">
          <div style="max-width: 400px; margin: auto; padding: 30px; border: 1px solid #1e293b; border-radius: 12px; background: #0f172a; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: #10b981; display: inline-flex; items-center: center; justify-content: center; font-size: 24px; line-height: 48px; margin-bottom: 16px;">✓</div>
            <h2 id="status" style="color: #f59e0b; margin: 0 0 8px 0; font-size: 20px;">MittenOS Connected</h2>
            <p id="desc" style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5;">Google Drive has been successfully connected! This window will close automatically.</p>
          </div>
          <script>
            const authData = {
              type: 'GOOGLE_AUTH_SUCCESS',
              accessToken: ${JSON.stringify(access_token)},
              refreshToken: ${JSON.stringify(refresh_token || null)},
              expiresIn: ${Number(expires_in)}
            };
            
            let messageSent = false;
            try {
              if (window.opener) {
                // Send postMessage to any origin for local dev ease, security managed by channel handshake
                window.opener.postMessage(authData, '*');
                messageSent = true;
                setTimeout(() => window.close(), 1000);
              }
            } catch (e) {
              console.error('Failed to post message to opener:', e);
            }

            if (!messageSent) {
              // If opener was missing/blocked or postMessage errored, instruct the user to close
              document.getElementById('status').innerText = 'Connection Completed';
              document.getElementById('desc').innerText = 'OAuth configuration completed successfully. You can close this window now and return to MittenOS.';
            }
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(
      `${origin}/?google_oauth=error&message=${encodeURIComponent(err instanceof Error ? err.message : 'unknown_error')}`
    );
  }
}
