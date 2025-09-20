import { videoProcessor } from '$lib/utils/ffmpeg';
import { googleDriveService } from '$lib/utils/googleDrive';
import { tinyUrlService } from '$lib/utils/tinyurl';
import { addToQueue, updateTaskProgress, completeTask, type ProcessingTask } from '$lib/stores/video';
import { databaseService } from '$lib/services/database';
import { getCurrentUser } from '$lib/supabase';
import { generateId } from '$lib/utils/format';
import { browser } from '$app/environment';

export interface ProcessingOptions {
  quality: number; // 0.1 to 1.0
  enableGoogleDrive: boolean;
  enableTinyUrl: boolean;
  folderId?: string;
}

export class VideoProcessingService {
  private isProcessing = false;
  
  async processVideo(
    file: File,
    options: ProcessingOptions = {
      quality: 0.8,
      enableGoogleDrive: true,
      enableTinyUrl: true,
    }
  ): Promise<ProcessingTask> {
    if (!browser) {
      throw new Error('Video processing can only be used in the browser');
    }
    
    if (this.isProcessing) {
      throw new Error('Another video is currently being processed');
    }
    
    this.isProcessing = true;
    const taskId = addToQueue(file);
    
    // Get current user for database tracking
    const user = await getCurrentUser();
    let dbJobId: string | null = null;
    
    try {
      // Create database job record if user is authenticated
      if (user) {
        dbJobId = await databaseService.createProcessingJob({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          status: 'pending',
          progress: 0,
          original_size: file.size
        });
      }
      
      // Update status to processing
      updateTaskProgress(taskId, 0, 'processing');
      
      // Update database status
      if (dbJobId) {
        await databaseService.updateProcessingJob(dbJobId, {
          status: 'processing',
          progress: 0
        });
      }
      
      // Step 1: Compress video (0-70% progress)
      updateTaskProgress(taskId, 10, 'processing');
      const compressedFile = await this.compressVideo(file, (progress) => {
        updateTaskProgress(taskId, 10 + (progress * 0.6), 'processing');
      });
      
      // Step 2: Upload to Google Drive (70-90% progress)
      let driveFile = null;
      if (options.enableGoogleDrive) {
        updateTaskProgress(taskId, 70, 'processing');
        try {
          driveFile = await this.uploadToGoogleDrive(compressedFile, options.folderId);
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
      
      // Complete the task
      const processingTime = Date.now(); // Would be calculated from start time
      
      // Update database with completion
      if (dbJobId) {
        await databaseService.updateProcessingJob(dbJobId, {
          status: 'completed',
          progress: 100,
          compressed_size: compressedFile.size,
          processing_time: processingTime,
          download_url: URL.createObjectURL(compressedFile),
          share_url: shareUrl
        });
      }
      
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
      
      // Update database with error
      if (dbJobId) {
        await databaseService.updateProcessingJob(dbJobId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
      
      completeTask(taskId, {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
  
  private async compressVideo(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    try {
      return await videoProcessor.compressVideo(file, onProgress);
    } catch (error) {
      console.error('Video compression failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to initialize video processor')) {
          throw new Error('Video processor initialization failed. Please check your internet connection and try again.');
        } else if (error.message.includes('Failed to compress video')) {
          throw new Error('Video compression failed. The file might be corrupted or in an unsupported format.');
        } else {
          throw new Error(`Video compression failed: ${error.message}`);
        }
      }
      
      throw new Error('Failed to compress video. Please try again.');
    }
  }
  
  private async uploadToGoogleDrive(
    file: File,
    folderId?: string
  ): Promise<any> {
    try {
      return await googleDriveService.uploadFile(file, {
        folderId,
        fileName: file.name,
        mimeType: file.type,
        resumable: file.size > 5 * 1024 * 1024, // 5MB
      });
    } catch (error) {
      console.error('Google Drive upload failed:', error);
      throw new Error('Failed to upload to Google Drive. Please check your authentication.');
    }
  }
  
  private async generateShortLink(longUrl: string): Promise<any> {
    try {
      return await tinyUrlService.shortenUrl(longUrl, 'compressed-video');
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
    
    // Check file size (200MB limit)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size too large. Maximum size: ${this.formatFileSize(maxSize)}`);
    }
    
    // Check file format
    const supportedFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      errors.push(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
    }
    
    // Check MIME type
    const supportedMimeTypes = [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-matroska',
      'video/webm',
    ];
    if (!supportedMimeTypes.includes(file.type)) {
      errors.push('Unsupported MIME type');
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
}

// Singleton instance
export const videoProcessingService = new VideoProcessingService();
