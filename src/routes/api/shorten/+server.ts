export const POST = async (
  event: {
    request: Request;
    fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
  }
) => {
  try {
    const { request, fetch: fetchFn } = event;
    const body = await request.json().catch(() => ({}));
    const longUrl: string | undefined = body?.url;
    const alias: string | undefined = body?.alias;

    if (!longUrl || typeof longUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey: string | undefined =
      ((globalThis as any)?.process?.env?.TINYURL_API_KEY as string | undefined) ||
      ((globalThis as any)?.process?.env?.VITE_TINYURL_API_KEY as string | undefined) ||
      ((import.meta as any)?.env?.VITE_TINYURL_API_KEY as string | undefined);

    // Prefer TinyURL v2 API when API key is available
    if (apiKey) {
      const res = await fetchFn('https://api.tinyurl.com/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          url: longUrl,
          domain: 'tinyurl.com',
          ...(alias ? { alias } : {})
        })
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const apiError = (data && (data.errors?.[0]?.message || data.message)) || res.statusText;
        return new Response(JSON.stringify({ error: `TinyURL API error: ${apiError}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const shortUrl: string | undefined = (data && (data.data?.tiny_url || data.tiny_url || data.shortUrl)) as string | undefined;
      if (!shortUrl) {
        return new Response(JSON.stringify({ error: 'TinyURL API returned no shortened URL' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(
        JSON.stringify({ shortUrl: shortUrl.trim(), longUrl, alias }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to the simple endpoint (works server-side without CORS)
    const url = new URL('https://tinyurl.com/api-create.php');
    url.searchParams.set('url', longUrl);
    if (alias) url.searchParams.set('alias', alias);

    const res = await fetchFn(url.toString(), { method: 'GET' });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `TinyURL API error: ${res.statusText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const shortUrlText = (await res.text()).trim();
    if (!shortUrlText || shortUrlText.toLowerCase().includes('error')) {
      return new Response(JSON.stringify({ error: `TinyURL API returned error: ${shortUrlText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ shortUrl: shortUrlText, longUrl, alias }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Failed to shorten URL: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

