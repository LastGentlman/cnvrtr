import type { RequestHandler } from '@sveltejs/kit';

function base64UrlEncode(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function generateCodeVerifierAndChallenge(): Promise<{ verifier: string; challenge: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64UrlEncode(random.buffer);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge };
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${url.origin}/auth/google-drive/callback`;
  const scope = 'https://www.googleapis.com/auth/drive.file';

  if (!clientId) {
    return new Response('Missing VITE_GOOGLE_CLIENT_ID', { status: 500 });
  }

  const state = crypto.randomUUID();
  const { verifier, challenge } = await generateCodeVerifierAndChallenge();

  cookies.set('gd_oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 300 });
  cookies.set('gd_oauth_verifier', verifier, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 300 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    include_granted_scopes: 'true',
    access_type: 'offline',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return new Response(null, {
    status: 302,
    headers: { Location: authUrl }
  });
};

