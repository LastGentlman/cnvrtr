// Bitly API v4 integration
export interface BitlyLink {
  id: string;
  link: string;
  long_url: string;
  title?: string;
  created_at: string;
  modified_at: string;
  archived: boolean;
  tags: string[];
  deeplinks: any[];
  custom_bitlinks: string[];
  is_deleted: boolean;
  clicks: number;
  created_by: string;
  client_id: string;
  bitly_id: string;
}

export interface BitlyConfig {
  endpoint: string;
  accessToken: string;
  customDomain?: string;
  groupGuid?: string;
}

export class BitlyService {
  private config: BitlyConfig;
  
  constructor(config: BitlyConfig) {
    this.config = config;
  }
  
  async shortenUrl(longUrl: string, title?: string): Promise<BitlyLink> {
    const requestBody = {
      long_url: longUrl,
      title: title,
      ...(this.config.customDomain && { domain: this.config.customDomain }),
      ...(this.config.groupGuid && { group_guid: this.config.groupGuid }),
    };
    
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Bitly API error: ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data.link;
  }
  
  async getLinkInfo(bitlink: string): Promise<BitlyLink> {
    const response = await fetch(
      `https://api-ssl.bitly.com/v4/bitlinks/${bitlink}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get link info: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getLinkClicks(bitlink: string, unit: string = 'day', units: number = 30): Promise<{
    clicks: Array<{
      clicks: number;
      date: string;
    }>;
    total_clicks: number;
  }> {
    const response = await fetch(
      `https://api-ssl.bitly.com/v4/bitlinks/${bitlink}/clicks?unit=${unit}&units=${units}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get link clicks: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async updateLink(bitlink: string, updates: {
    title?: string;
    long_url?: string;
    archived?: boolean;
  }): Promise<BitlyLink> {
    const response = await fetch(
      `https://api-ssl.bitly.com/v4/bitlinks/${bitlink}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to update link: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async deleteLink(bitlink: string): Promise<void> {
    const response = await fetch(
      `https://api-ssl.bitly.com/v4/bitlinks/${bitlink}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete link: ${response.statusText}`);
    }
  }
  
  async getUserInfo(): Promise<{
    login: string;
    name: string;
    default_group_guid: string;
    created: string;
    is_verified: boolean;
    is_sso_user: boolean;
    is_2fa_enabled: boolean;
    has_password: boolean;
  }> {
    const response = await fetch(
      'https://api-ssl.bitly.com/v4/user',
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getGroups(): Promise<Array<{
    guid: string;
    name: string;
    created: string;
    modified: string;
    organization_guid: string;
    is_active: boolean;
    role: string;
  }>> {
    const response = await fetch(
      'https://api-ssl.bitly.com/v4/groups',
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get groups: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.groups;
  }
}

// Singleton instance
export const bitlyService = new BitlyService({
  endpoint: 'https://api-ssl.bitly.com/v4/shorten',
  accessToken: import.meta.env.VITE_BITLY_ACCESS_TOKEN || '',
  customDomain: import.meta.env.VITE_BITLY_CUSTOM_DOMAIN,
  groupGuid: import.meta.env.VITE_BITLY_GROUP_GUID,
});
