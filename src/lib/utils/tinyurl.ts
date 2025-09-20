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
      // TinyURL's simple API endpoint
      const url = new URL('https://tinyurl.com/api-create.php');
      url.searchParams.set('url', longUrl);
      
      if (alias) {
        url.searchParams.set('alias', alias);
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Convertr/1.0',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      });
      
      if (!response.ok) {
        throw new Error(`TinyURL API error: ${response.statusText}`);
      }
      
      const shortUrl = await response.text();
      
      // TinyURL returns just the shortened URL as plain text
      if (!shortUrl || shortUrl.includes('Error') || shortUrl.includes('error')) {
        throw new Error(`TinyURL API returned error: ${shortUrl}`);
      }
      
      return {
        shortUrl: shortUrl.trim(),
        longUrl,
        alias
      };
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
