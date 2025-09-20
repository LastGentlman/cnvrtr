import { addToQueue, updateTaskProgress, completeTask, type ProcessingTask } from '$lib/stores/video';
import { browser } from '$app/environment';

export class DemoVideoProcessingService {
  private isProcessing = false;
  
  async processVideo(
    file: File,
    options: {
      quality: number;
      enableGoogleDrive: boolean;
      enableBitly: boolean;
    } = {
      quality: 0.8,
      enableGoogleDrive: false,
      enableBitly: false,
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
    
    try {
      // Simulate processing steps
      updateTaskProgress(taskId, 0, 'processing');
      
      // Step 1: Simulate compression (0-70% progress)
      for (let i = 0; i <= 70; i += 10) {
        await this.delay(200);
        updateTaskProgress(taskId, i, 'processing');
      }
      
      // Step 2: Simulate upload (70-90% progress)
      if (options.enableGoogleDrive) {
        for (let i = 70; i <= 90; i += 5) {
          await this.delay(150);
          updateTaskProgress(taskId, i, 'processing');
        }
      } else {
        updateTaskProgress(taskId, 90, 'processing');
      }
      
      // Step 3: Simulate link generation (90-100% progress)
      if (options.enableBitly) {
        for (let i = 90; i <= 100; i += 2) {
          await this.delay(100);
          updateTaskProgress(taskId, i, 'processing');
        }
      } else {
        updateTaskProgress(taskId, 100, 'processing');
      }
      
      // Create a mock compressed file (just copy the original for demo)
      const mockCompressedFile = new File([file], file.name.replace(/\.[^/.]+$/, '_compressed.mp4'), {
        type: 'video/mp4'
      });
      
      // Complete the task
      const compressionRatio = 0.7; // Simulate 30% compression
      const processingTime = 5000; // 5 seconds
      
      completeTask(taskId, {
        compressedSize: Math.round(file.size * compressionRatio),
        downloadUrl: URL.createObjectURL(mockCompressedFile),
        shareUrl: options.enableBitly ? 'https://bit.ly/demo123' : undefined,
      });
      
      return {
        id: taskId,
        file,
        status: 'completed',
        progress: 100,
        originalSize: file.size,
        compressedSize: Math.round(file.size * compressionRatio),
        processingTime,
        downloadUrl: URL.createObjectURL(mockCompressedFile),
        shareUrl: options.enableBitly ? 'https://bit.ly/demo123' : undefined,
      };
      
    } catch (error) {
      console.error('Demo processing failed:', error);
      updateTaskProgress(taskId, 0, 'error');
      completeTask(taskId, {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const demoVideoProcessingService = new DemoVideoProcessingService();
