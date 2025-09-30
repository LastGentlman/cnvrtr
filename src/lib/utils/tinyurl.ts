// TinyURL API integration
export interface TinyUrlResponse {
  shortUrl: string;
  longUrl: string;
  alias?: string;
}

export interface TinyUrlConfig {
  apiKey?: string;
  baseUrl: string;
}

export class TinyUrlService {
  private config: TinyUrlConfig;
  
  constructor(config: TinyUrlConfig) {
    this.config = config;
  }
  
  async shortenUrl(longUrl: string, alias?: string): Promise<TinyUrlResponse> {
    try {
      // Prefer server proxy to avoid CORS and keep API key private
      try {
        const proxyRes = await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ url: longUrl, ...(alias ? { alias } : {}) })
        });
        const proxyData = await proxyRes.json().catch(() => ({} as any));
        if (proxyRes.ok && proxyData?.shortUrl) {
          return {
            shortUrl: String(proxyData.shortUrl).trim(),
            longUrl,
            alias
          };
        }
        // If proxy failed, fall through to direct calls
      } catch {}

      // If API key is present, use TinyURL v2 API (supports CORS)
      if (this.config.apiKey) {
        const response = await fetch('https://api.tinyurl.com/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            url: longUrl,
            domain: 'tinyurl.com',
            ...(alias ? { alias } : {})
          })
        });
        
        const data = await response.json().catch(() => ({} as any));
        
        if (!response.ok) {
          const apiError = (data && (data.errors?.[0]?.message || data.message)) || response.statusText;
          throw new Error(`TinyURL API error: ${apiError}`);
        }
        
        const shortUrl: string | undefined = (data && (data.data?.tiny_url || data.tiny_url || data.shortUrl)) as string | undefined;
        if (!shortUrl) {
          throw new Error('TinyURL API returned no shortened URL');
        }
        
        return {
          shortUrl: shortUrl.trim(),
          longUrl,
          alias
        };
      }
      
      // Fallback: TinyURL simple endpoint (may not support CORS reliably)
      const url = new URL('https://tinyurl.com/api-create.php');
      url.searchParams.set('url', longUrl);
      if (alias) url.searchParams.set('alias', alias);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        // No custom headers; browsers restrict certain headers like User-Agent
      });
      
      if (!response.ok) {
        throw new Error(`TinyURL API error: ${response.statusText}`);
      }
      
      const shortUrlText = await response.text();
      if (!shortUrlText || shortUrlText.includes('Error') || shortUrlText.includes('error')) {
        throw new Error(`TinyURL API returned error: ${shortUrlText}`);
      }
      
      return { shortUrl: shortUrlText.trim(), longUrl, alias };
    } catch (error) {
      console.error('TinyURL API error:', error);
      throw new Error(`Failed to shorten URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async expandUrl(shortUrl: string): Promise<string> {
    try {
      // For expanding URLs, we can make a HEAD request to get the final URL
      const response = await fetch(shortUrl, {
        method: 'HEAD',
        redirect: 'manual'
      });
      
      if (response.status === 301 || response.status === 302) {
        const location = response.headers.get('location');
        if (location) {
          return location;
        }
      }
      
      throw new Error('Could not expand URL');
    } catch (error) {
      console.error('Failed to expand URL:', error);
      throw new Error(`Failed to expand URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getUrlInfo(shortUrl: string): Promise<{
    shortUrl: string;
    longUrl: string;
    clicks?: number;
    createdAt?: string;
  }> {
    try {
      // TinyURL doesn't provide detailed analytics in their free API
      // This is a basic implementation that returns what we can get
      const longUrl = await this.expandUrl(shortUrl);
      
      return {
        shortUrl,
        longUrl,
        // TinyURL free API doesn't provide click counts or creation dates
        clicks: undefined,
        createdAt: undefined
      };
    } catch (error) {
      console.error('Failed to get URL info:', error);
      throw new Error(`Failed to get URL info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // TinyURL doesn't support updating or deleting URLs in their free API
  // These methods are kept for compatibility but will throw errors
  async updateUrl(shortUrl: string, updates: {
    longUrl?: string;
    alias?: string;
  }): Promise<TinyUrlResponse> {
    throw new Error('TinyURL free API does not support updating URLs. Please create a new shortened URL.');
  }
  
  async deleteUrl(shortUrl: string): Promise<void> {
    throw new Error('TinyURL free API does not support deleting URLs.');
  }
  
  async getUserInfo(): Promise<{
    username?: string;
    plan?: string;
    urlsCreated?: number;
  }> {
    // TinyURL free API doesn't provide user info
    return {
      username: undefined,
      plan: 'free',
      urlsCreated: undefined
    };
  }
}

// Singleton instance
export const tinyUrlService = new TinyUrlService({
  apiKey: import.meta.env.VITE_TINYURL_API_KEY || undefined,
  baseUrl: 'https://tinyurl.com'
});
