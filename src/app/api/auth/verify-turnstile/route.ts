import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // If Turnstile secret key is not configured on the server, bypass verification gracefully
    if (!secretKey || !secretKey.trim()) {
      return NextResponse.json({
        success: true,
        bypassed: true,
        message: 'Turnstile bypassed (no TURNSTILE_SECRET_KEY configured)',
      });
    }

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare Turnstile token is required' },
        { status: 400 }
      );
    }

    const isTestSecret = secretKey.startsWith('1x0000000000000000000000000000000AA');
    const isDevEnv = process.env.NODE_ENV === 'development' || isTestSecret;

    // Gracefully handle bypass tokens in development or testing mode
    if (token.startsWith('bypassed-')) {
      if (isDevEnv || !secretKey) {
        return NextResponse.json({
          success: true,
          bypassed: true,
          message: `Turnstile verification bypassed (${token}) in development mode`,
        });
      }
    }

    // Get client IP if available
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '';

    const formData = new URLSearchParams();
    formData.append('secret', secretKey.trim());
    formData.append('response', token.trim());
    if (ip) {
      formData.append('remoteip', ip);
    }

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const outcome = await verifyRes.json();

    if (outcome.success) {
      return NextResponse.json({
        success: true,
        timestamp: outcome.challenge_ts,
        hostname: outcome.hostname,
      });
    } else {
      const errorCodes = outcome['error-codes'] ? outcome['error-codes'].join(', ') : 'Verification failed';
      console.warn('[Turnstile] Verification failed:', errorCodes, outcome);
      return NextResponse.json(
        {
          success: false,
          error: `Security verification failed (${errorCodes}). Please try again.`,
          errorCodes: outcome['error-codes'] || [],
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Turnstile] Error during verification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error validating security challenge' },
      { status: 500 }
    );
  }
}
