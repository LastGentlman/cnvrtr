import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('gd_oauth_state');
  const verifier = cookies.get('gd_oauth_verifier');

  if (!code || !state || !storedState || state !== storedState || !verifier) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;
  const redirectUri = `${url.origin}/auth/google-drive/callback`;

  if (!clientId || !clientSecret) {
    return new Response('Missing Google OAuth env vars', { status: 500 });
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token exchange failed: ${text}`, { status: 500 });
  }

  const tokens = await tokenRes.json();

  // Persist refresh token in httpOnly cookie (short domain demo; adjust security in prod)
  if (tokens.refresh_token) {
    cookies.set('gd_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
  }

  // Clean up temporary cookies
  cookies.delete('gd_oauth_state', { path: '/' });
  cookies.delete('gd_oauth_verifier', { path: '/' });

  // Redirect back to app page
  const returnTo = '/';
  return new Response(null, { status: 302, headers: { Location: returnTo } });
};

