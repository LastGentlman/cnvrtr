import { videoProcessor } from '$lib/utils/ffmpeg';
import { googleDriveService } from '$lib/utils/googleDrive';
import { tinyUrlService } from '$lib/utils/tinyurl';
import { addToQueue, updateTaskProgress, completeTask, failTask, type ProcessingTask } from '$lib/stores/video';
import { generateId } from '$lib/utils/format';
import { browser } from '$app/environment';
import {
  isFileSystemAccessSupported,
  pickDirectory,
  saveFileToDirectory,
  readBackFile,
  deleteSavedFile,
  type SavedFileHandle
} from '$lib/utils/fileSystem';

export interface ProcessingOptions {
  quality: number; // 0.1 to 1.0
  enableGoogleDrive: boolean;
  enableTinyUrl: boolean;
  folderId?: string;
  preferredFormat?: 'webm' | 'mp4'; // Default: 'webm'
}

export class VideoProcessingService {
  private isProcessing = false;
  private userDirectoryHandle: FileSystemDirectoryHandle | null = null;
  private abortController: AbortController | null = null;
  
  async processVideo(
    file: File,
    options: ProcessingOptions = {
      quality: 0.8,
      enableGoogleDrive: true,
      enableTinyUrl: true,
      preferredFormat: 'mp4',
    }
  ): Promise<ProcessingTask> {
    if (!browser) {
      throw new Error('Video processing can only be used in the browser');
    }
    
    if (this.isProcessing) {
      throw new Error('Another video is currently being processed');
    }
    
    this.isProcessing = true;
    this.abortController = new AbortController();
    const taskId = addToQueue(file);
    const startTimeMs = Date.now();
    
    try {
      // Update status to processing
      updateTaskProgress(taskId, 0, 'processing');
      
      // Optional: Pre-auth with Google to avoid redirect after heavy work
      if (options.enableGoogleDrive) {
        try {
          await googleDriveService.authenticate();
        } catch (err) {
          // If this triggers a redirect, control never reaches here until after return
          // If it fails without redirect, continue and allow upload step to retry
          console.warn('Pre-auth with Google failed or pending redirect:', err);
        }
      }
      
      // Step 1: Initialize FFmpeg and compress video (0-70% progress)
      updateTaskProgress(taskId, 5, 'processing');
      console.log('Initializing video processor...');
      
      const compressedFile = await this.compressVideo(file, (progress) => {
        // Map FFmpeg progress (0-100) to our progress range (5-70)
        const mappedProgress = 5 + (progress * 0.65);
        updateTaskProgress(taskId, mappedProgress, 'processing');
      }, options.preferredFormat);
      
      // Step 1.5: Save compressed file to user-selected folder (if supported)
      let saved: SavedFileHandle | null = null;
      if (isFileSystemAccessSupported()) {
        try {
          if (!this.userDirectoryHandle) {
            this.userDirectoryHandle = await pickDirectory();
          }
          updateTaskProgress(taskId, 68, 'processing');
          const suggestedName = compressedFile.name;
          saved = await saveFileToDirectory(this.userDirectoryHandle, compressedFile, suggestedName);
        } catch (err) {
          console.warn('Saving to user-selected folder failed; proceeding without local save:', err);
        }
      }
      
      // Step 2: Upload to Google Drive (70-90% progress)
      let driveFile = null;
      if (options.enableGoogleDrive) {
        updateTaskProgress(taskId, 70, 'processing');
        try {
          const fileForUpload = saved ? await readBackFile(saved.fileHandle) : compressedFile;
          driveFile = await this.uploadToGoogleDrive(fileForUpload, options.folderId, this.abortController?.signal || undefined);
          updateTaskProgress(taskId, 90, 'processing');
        } catch (error) {
          console.warn('Google Drive upload failed:', error);
          // Continue without Google Drive upload
        }
      }
      
      // Step 3: Generate shortened link (90-100% progress)
      let shareUrl = null;
      if (options.enableTinyUrl && driveFile) {
        updateTaskProgress(taskId, 90, 'processing');
        try {
          const tinyUrlResponse = await this.generateShortLink(driveFile.webViewLink);
          shareUrl = tinyUrlResponse.shortUrl;
          updateTaskProgress(taskId, 100, 'processing');
        } catch (error) {
          console.warn('TinyURL link generation failed:', error);
          // Use Google Drive link as fallback
          shareUrl = driveFile?.webViewLink || null;
        }
      } else if (driveFile) {
        shareUrl = driveFile.webViewLink;
        updateTaskProgress(taskId, 100, 'processing');
      }
      
      // Step 4: Clean up local saved copy if upload succeeded and we created one
      if (driveFile && saved && this.userDirectoryHandle) {
        try {
          await deleteSavedFile(this.userDirectoryHandle, saved.suggestedName);
        } catch (err) {
          console.warn('Failed to delete local saved file:', err);
        }
      }
      
      // Complete the task
      const processingTime = Date.now() - startTimeMs;
      
      // Processing completed successfully
      
      completeTask(taskId, {
        compressedSize: compressedFile.size,
        processingTime,
        downloadUrl: URL.createObjectURL(compressedFile),
        shareUrl,
      });
      
      return {
        id: taskId,
        file,
        status: 'completed',
        progress: 100,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        processingTime,
        downloadUrl: URL.createObjectURL(compressedFile),
        shareUrl,
      };
      
    } catch (error) {
      console.error('Video processing failed:', error);
      updateTaskProgress(taskId, 0, 'error');
      
      // Processing failed
      failTask(taskId, error instanceof Error ? error.message : 'Unknown error occurred');
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }
  
  private async compressVideo(
    file: File,
    onProgress?: (progress: number) => void,
    preferredFormat?: 'webm' | 'mp4'
  ): Promise<File> {
    try {
      console.log('Starting video compression...');
      return await videoProcessor.compressVideo(file, onProgress, preferredFormat);
    } catch (error) {
      console.error('Video compression failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to initialize video processor')) {
          throw new Error('Video processor initialization failed. Please check your internet connection and try again.');
        } else if (error.message.includes('FFmpeg load timeout')) {
          throw new Error('Video processor loading timed out. Please check your internet connection and try again.');
        } else if (error.message.includes('Failed to compress video')) {
          throw new Error('Video compression failed. The file might be corrupted or in an unsupported format.');
        } else if (error.message.includes('memory access out of bounds')) {
          throw new Error('Video file is too large or complex for processing. Please try with a smaller file or lower resolution.');
        } else if (error.message.includes('All CDN sources failed')) {
          throw new Error('Unable to load video processor. Please check your internet connection and try again.');
        } else {
          throw new Error(`Video compression failed: ${error.message}`);
        }
      }
      
      throw new Error('Failed to compress video. Please try again.');
    }
  }
  
  private async uploadToGoogleDrive(
    file: File,
    folderId?: string,
    signal?: AbortSignal
  ): Promise<any> {
    try {
      // Ensure the user is authenticated with Google before upload
      await googleDriveService.authenticate();
      return await googleDriveService.uploadFile(file, {
        folderId,
        fileName: file.name,
        mimeType: file.type,
        resumable: true,
      }, signal);
    } catch (error) {
      console.error('Google Drive upload failed:', error);
      throw new Error('Failed to upload to Google Drive. Please check your authentication.');
    }
  }
  
  private async generateShortLink(longUrl: string): Promise<any> {
    try {
      // Do not use a static alias to avoid collisions
      return await tinyUrlService.shortenUrl(longUrl);
    } catch (error) {
      console.error('TinyURL link generation failed:', error);
      throw new Error('Failed to generate shortened link. Please try again.');
    }
  }
  
  async generateThumbnail(file: File, timeOffset: number = 1): Promise<string> {
    try {
      return await videoProcessor.generateThumbnail(file, timeOffset);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }
  
  async getVideoInfo(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    bitrate: number;
  }> {
    try {
      return await videoProcessor.getVideoInfo(file);
    } catch (error) {
      console.error('Failed to get video info:', error);
      throw new Error('Failed to get video information');
    }
  }
  
  async validateFile(file: File): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Check file size (50MB limit for better memory management)
    const maxSize = 50 * 1024 * 1024; // Reduced from 200MB to 50MB for better memory management
    if (file.size > maxSize) {
      errors.push(`File size too large. Maximum size: ${this.formatFileSize(maxSize)}. Large files may cause memory issues during processing.`);
    }
    
    // Warn for files larger than 20MB
    const warningSize = 20 * 1024 * 1024;
    if (file.size > warningSize) {
      console.warn(`Large file detected (${this.formatFileSize(file.size)}). Processing may take longer and use more memory.`);
    }
    
    // Check file format - prioritize WebM and MP4 for web optimization
    const preferredFormats = ['webm', 'mp4']; // Preferred formats for web
    const supportedFormats = ['webm', 'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', '3gp'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      errors.push(`Unsupported file format. Preferred formats: ${preferredFormats.join(', ')}. Supported formats: ${supportedFormats.join(', ')}`);
    } else if (!preferredFormats.includes(fileExtension)) {
      // Add a warning for non-preferred formats
      console.warn(`File format '${fileExtension}' is supported but not optimized for web. Consider using WebM or MP4 for better performance.`);
    }
    
    // Check MIME type - prioritize WebM and MP4
    const preferredMimeTypes = ['video/webm', 'video/mp4'];
    const supportedMimeTypes = [
      'video/webm',
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-matroska',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/3gpp',
    ];
    
    if (!supportedMimeTypes.includes(file.type)) {
      errors.push(`Unsupported MIME type. Preferred types: ${preferredMimeTypes.join(', ')}`);
    } else if (!preferredMimeTypes.includes(file.type)) {
      // Add a warning for non-preferred MIME types
      console.warn(`MIME type '${file.type}' is supported but not optimized for web. Consider using video/webm or video/mp4 for better performance.`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  async cleanup(): Promise<void> {
    await videoProcessor.cleanup();
  }

  async cancelProcessing(): Promise<void> {
    if (!this.isProcessing) return;
    try {
      this.abortController?.abort();
    } catch {}
    try {
      await videoProcessor.cancelCurrentOperation();
    } catch {}
    this.isProcessing = false;
  }
}

// Singleton instance
export const videoProcessingService = new VideoProcessingService();
