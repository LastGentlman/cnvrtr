import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
  const refreshToken = cookies.get('gd_refresh_token');
  if (!refreshToken) {
    return new Response(JSON.stringify({ error: 'not_authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing Google OAuth env vars', { status: 500 });
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const bodyText = await tokenRes.text();
  if (!tokenRes.ok) {
    return new Response(`Failed to refresh token: ${bodyText}`, { status: 401 });
  }

  const json = JSON.parse(bodyText);
  return new Response(JSON.stringify({ access_token: json.access_token, expires_in: json.expires_in }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

