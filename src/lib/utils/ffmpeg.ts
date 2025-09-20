import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { browser } from '$app/environment';

export class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  
  constructor() {
    // Only initialize FFmpeg in the browser
    if (browser) {
      this.ffmpeg = new FFmpeg();
    }
  }
  
  async load(): Promise<void> {
    if (!browser) {
      throw new Error('FFmpeg can only be used in the browser');
    }
    
    if (this.isLoaded || !this.ffmpeg) return;
    
    try {
      // Load FFmpeg with optimized settings - try multiple CDNs for reliability
      const cdnUrls = [
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
        'https://cdnjs.cloudflare.com/ajax/libs/ffmpeg.js/0.12.6/umd'
      ];
      
      let loadSuccess = false;
      let lastError: Error | null = null;
      
      for (const baseURL of cdnUrls) {
        try {
          console.log(`Attempting to load FFmpeg from: ${baseURL}`);
          
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          loadSuccess = true;
          console.log('FFmpeg loaded successfully from:', baseURL);
          break;
        } catch (error) {
          console.warn(`Failed to load from ${baseURL}:`, error);
          lastError = error as Error;
          continue;
        }
      }
      
      if (!loadSuccess) {
        throw lastError || new Error('All CDN sources failed');
      }
      
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load FFmpeg from all sources:', error);
      throw new Error('Failed to initialize video processor. Please check your internet connection and try again.');
    }
  }
  
  async compressVideo(
    inputFile: File,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    if (!browser) {
      throw new Error('FFmpeg can only be used in the browser');
    }
    
    if (!this.isLoaded || !this.ffmpeg) {
      await this.load();
    }
    
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';
    
    try {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }
      
      // Write input file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));
      
      // Set up progress tracking
      this.ffmpeg.on('progress', ({ progress }) => {
        if (onProgress) {
          onProgress(progress * 100);
        }
      });
      
      // Run compression command
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-crf', '28', // Quality setting (lower = better quality, higher file size)
        '-preset', 'medium', // Encoding speed vs compression efficiency
        '-c:a', 'aac',
        '-b:a', '128k', // Audio bitrate
        '-movflags', '+faststart', // Optimize for streaming
        '-y', // Overwrite output file
        outputFileName
      ]);
      
      // Read the output file
      const outputData = await this.ffmpeg.readFile(outputFileName);
      
      // Convert to Blob and create File
      const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
      const outputFile = new File([outputBlob], this.getOutputFileName(inputFile.name), {
        type: 'video/mp4'
      });
      
      // Clean up files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);
      
      return outputFile;
    } catch (error) {
      console.error('Video compression failed:', error);
      throw new Error('Failed to compress video');
    }
  }
  
  async generateThumbnail(
    inputFile: File,
    timeOffset: number = 1
  ): Promise<string> {
    if (!browser) {
      throw new Error('FFmpeg can only be used in the browser');
    }
    
    if (!this.isLoaded || !this.ffmpeg) {
      await this.load();
    }
    
    const inputFileName = 'input.mp4';
    const outputFileName = 'thumbnail.jpg';
    
    try {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }
      
      // Write input file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));
      
      // Generate thumbnail
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-ss', timeOffset.toString(),
        '-vframes', '1',
        '-q:v', '2', // High quality thumbnail
        '-y',
        outputFileName
      ]);
      
      // Read the thumbnail
      const thumbnailData = await this.ffmpeg.readFile(outputFileName);
      
      // Convert to base64 data URL
      const thumbnailBlob = new Blob([thumbnailData as BlobPart], { type: 'image/jpeg' });
      const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
      
      // Clean up files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);
      
      return thumbnailUrl;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }
  
  async getVideoInfo(inputFile: File): Promise<{
    duration: number;
    width: number;
    height: number;
    bitrate: number;
  }> {
    if (!browser) {
      throw new Error('FFmpeg can only be used in the browser');
    }
    
    if (!this.isLoaded || !this.ffmpeg) {
      await this.load();
    }
    
    const inputFileName = 'input.mp4';
    
    try {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }
      
      // Write input file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));
      
      // Get video information
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-f', 'null',
        '-'
      ]);
      
      // Parse FFmpeg output to extract video info
      // This is a simplified version - in a real implementation,
      // you'd parse the actual FFmpeg output
      const duration = 0; // Would be extracted from FFmpeg output
      const width = 1920; // Would be extracted from FFmpeg output
      const height = 1080; // Would be extracted from FFmpeg output
      const bitrate = 0; // Would be extracted from FFmpeg output
      
      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);
      
      return { duration, width, height, bitrate };
    } catch (error) {
      console.error('Failed to get video info:', error);
      throw new Error('Failed to get video information');
    }
  }
  
  private getOutputFileName(originalName: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_compressed.mp4`;
  }
  
  async cleanup(): Promise<void> {
    if (this.isLoaded) {
      // FFmpeg cleanup is handled automatically
      this.isLoaded = false;
    }
  }
}

// Singleton instance
export const videoProcessor = new VideoProcessor();
