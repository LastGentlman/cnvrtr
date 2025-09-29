// Google Drive API integration
import { browser } from '$app/environment';
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
  createdTime: string;
  modifiedTime: string;
}

export interface DriveUploadConfig {
  folderId?: string;
  fileName: string;
  mimeType: string;
  resumable: boolean;
  chunkSize: number;
}

export class GoogleDriveService {
  private apiKey: string;
  private clientId: string;
  private accessToken: string | null = null;
  private tokenExpiryMs = 0;
  private tokenClient: any | null = null;
  private gisLoaded = false;
  private readonly scopes = 'https://www.googleapis.com/auth/drive.file';
  
  constructor(apiKey: string, clientId: string) {
    this.apiKey = apiKey;
    this.clientId = clientId;
  }
  
  setAccessToken(token: string, expiresInSeconds?: number) {
    this.accessToken = token;
    if (typeof expiresInSeconds === 'number' && isFinite(expiresInSeconds)) {
      this.tokenExpiryMs = Date.now() + (expiresInSeconds * 1000) - 15000; // 15s early skew
    }
  }
  
  private isTokenValid(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiryMs;
  }
  
  private async loadGis(): Promise<void> {
    if (!browser) return;
    if (this.gisLoaded) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        // If already loaded, resolve immediately
        if ((window as any).google?.accounts?.oauth2) {
          resolve();
        }
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      }
    });
    this.gisLoaded = true;
  }
  
  async authenticate(forceConsent: boolean = false): Promise<void> {
    if (!browser) {
      throw new Error('Google Drive authentication is only available in the browser');
    }
    await this.loadGis();
    if (!this.tokenClient) {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scopes,
        callback: (response: any) => {
          // This is handled in the request promise below
        }
      });
    }
    if (!forceConsent && this.isTokenValid()) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      try {
        this.tokenClient!.callback = (resp: any) => {
          if (resp?.access_token) {
            // Note: GIS does not always return expires_in here; best-effort if present
            this.setAccessToken(resp.access_token, resp.expires_in ?? 3600);
            resolve();
          } else if (resp?.error) {
            reject(new Error(resp.error));
          } else {
            reject(new Error('Authentication failed'));
          }
        };
        this.tokenClient!.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
      } catch (e) {
        reject(e);
      }
    });
  }
  
  private async ensureAccessToken(): Promise<void> {
    if (!this.isTokenValid()) {
      await this.authenticate(false);
    }
  }
  
  async uploadFile(
    file: File,
    config: Partial<DriveUploadConfig> = {}
  ): Promise<DriveFile> {
    const uploadConfig: DriveUploadConfig = {
      folderId: config.folderId || 'root',
      fileName: config.fileName || file.name,
      mimeType: config.mimeType || file.type,
      resumable: config.resumable ?? file.size > 5 * 1024 * 1024, // 5MB
      chunkSize: config.chunkSize || 256 * 1024, // 256KB
    };
    
    if (uploadConfig.resumable) {
      return this.uploadFileResumable(file, uploadConfig);
    } else {
      return this.uploadFileSimple(file, uploadConfig);
    }
  }
  
  private async uploadFileSimple(
    file: File,
    config: DriveUploadConfig
  ): Promise<DriveFile> {
    await this.ensureAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = {
      name: config.fileName,
      parents: config.folderId !== 'root' ? [config.folderId] : undefined,
    };
    
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    const created = await response.json();
    // Make the file shareable and fetch full info
    try {
      await this.setPublicLink(created.id);
    } catch {}
    return this.getFileInfo(created.id);
  }
  
  private async uploadFileResumable(
    file: File,
    config: DriveUploadConfig
  ): Promise<DriveFile> {
    await this.ensureAccessToken();
    // Step 1: Initialize resumable upload
    const metadata = {
      name: config.fileName,
      parents: config.folderId !== 'root' ? [config.folderId] : undefined,
    };
    
    const initResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': config.mimeType,
          'X-Upload-Content-Length': file.size.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );
    
    if (!initResponse.ok) {
      throw new Error(`Upload initialization failed: ${initResponse.statusText}`);
    }
    
    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received');
    }
    
    // Step 2: Upload file in chunks
    let uploadedBytes = 0;
    const totalBytes = file.size;
    
    while (uploadedBytes < totalBytes) {
      const chunkEnd = Math.min(uploadedBytes + config.chunkSize, totalBytes);
      const chunk = file.slice(uploadedBytes, chunkEnd);
      
      const chunkResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': (chunkEnd - uploadedBytes).toString(),
          'Content-Range': `bytes ${uploadedBytes}-${chunkEnd - 1}/${totalBytes}`,
        },
        body: chunk,
      });
      
      if (chunkResponse.status === 308) {
        // Continue uploading
        const rangeHeader = chunkResponse.headers.get('Range');
        if (rangeHeader) {
          const nextByte = parseInt(rangeHeader.split('-')[1]) + 1;
          uploadedBytes = nextByte;
        } else {
          uploadedBytes = chunkEnd;
        }
      } else if (chunkResponse.ok) {
        // Upload complete
        const created = await chunkResponse.json();
        try {
          await this.setPublicLink(created.id);
        } catch {}
        return this.getFileInfo(created.id);
      } else {
        throw new Error(`Chunk upload failed: ${chunkResponse.statusText}`);
      }
    }
    
    throw new Error('Upload incomplete');
  }
  
  async createFolder(name: string, parentId: string = 'root'): Promise<DriveFile> {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId !== 'root' ? [parentId] : undefined,
    };
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Folder creation failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getFileInfo(fileId: string): Promise<DriveFile> {
    await this.ensureAccessToken();
    const fields = encodeURIComponent('id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime');
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}&key=${this.apiKey}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.statusText}`);
    }
    
    return response.json();
  }

  private async setPublicLink(fileId: string): Promise<void> {
    await this.ensureAccessToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: false,
        }),
      }
    );
    if (!response.ok) {
      // Non-fatal; user may still access the file directly
      throw new Error(`Failed to set public permission: ${response.statusText}`);
    }
  }
  
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?key=${this.apiKey}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }
  
  async getQuota(): Promise<{ used: number; total: number }> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/about?fields=storageQuota&key=${this.apiKey}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get quota: ${response.statusText}`);
    }
    
    const data = await response.json();
    const quota = data.storageQuota;
    
    return {
      used: parseInt(quota.usage || '0'),
      total: parseInt(quota.limit || '0'),
    };
  }
}

// Singleton instance
export const googleDriveService = new GoogleDriveService(
  import.meta.env.VITE_GOOGLE_API_KEY || '',
  import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
);
