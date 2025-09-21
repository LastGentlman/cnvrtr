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
      // Configure FFmpeg with memory settings to prevent out of bounds errors
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg log:', message);
      });
    }
  }
  
  async load(): Promise<void> {
    if (!browser) {
      throw new Error('FFmpeg can only be used in the browser');
    }
    
    if (this.isLoaded || !this.ffmpeg) return;
    
    try {
      console.log('Starting FFmpeg initialization...');
      
      // Use local static files instead of CDN to avoid CORS issues
      const baseURL = '/ffmpeg';
      
      console.log(`Loading FFmpeg from local static files: ${baseURL}`);
      
      // Add timeout to prevent infinite hanging
      const loadPromise = this.ffmpeg!.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FFmpeg load timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      this.isLoaded = true;
      console.log('FFmpeg loaded successfully from local static files');
      
    } catch (error) {
      console.error('Failed to load FFmpeg from local static files:', error);
      throw new Error(`Failed to initialize video processor: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure FFmpeg files are available in the static directory.`);
    }
  }
  
  async compressVideo(
    inputFile: File,
    onProgress?: (progress: number) => void,
    preferredFormat: 'webm' | 'mp4' = 'webm'
  ): Promise<File> {
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
      
      // Set up progress tracking
      this.ffmpeg.on('progress', ({ progress }) => {
        if (onProgress) {
          onProgress(progress * 100);
        }
      });
      
      // Try WebM first (preferred format)
      if (preferredFormat === 'webm') {
        try {
          return await this.compressToWebM(inputFile, inputFileName, onProgress);
        } catch (webmError) {
          console.warn('WebM compression failed, falling back to MP4:', webmError);
          return await this.compressToMP4(inputFile, inputFileName, onProgress);
        }
      } else {
        // Try MP4 first
        try {
          return await this.compressToMP4(inputFile, inputFileName, onProgress);
        } catch (mp4Error) {
          console.warn('MP4 compression failed, falling back to WebM:', mp4Error);
          return await this.compressToWebM(inputFile, inputFileName, onProgress);
        }
      }
    } catch (error) {
      console.error('Video compression failed:', error);
      throw new Error('Failed to compress video');
    }
  }

  private async compressToWebM(
    inputFile: File,
    inputFileName: string,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    const outputFileName = 'output.webm';
    
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }
    
    // WebM compression with VP9 codec - optimized for web and memory usage
    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libvpx-vp9', // VP9 codec for WebM
      '-crf', '32', // Quality setting (higher = smaller file, less memory)
      '-b:v', '0', // Let CRF control bitrate
      '-deadline', 'realtime', // Faster encoding, less memory usage
      '-cpu-used', '4', // Higher CPU usage for faster encoding
      '-threads', '2', // Limit threads to reduce memory usage
      '-c:a', 'libopus', // Opus audio codec for WebM
      '-b:a', '96k', // Lower audio bitrate to save memory
      '-y', // Overwrite output file
      outputFileName
    ]);
    
    // Read the output file
    const outputData = await this.ffmpeg.readFile(outputFileName);
    
    // Convert to Blob and create File
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/webm' });
    const outputFile = new File([outputBlob], this.getOutputFileName(inputFile.name, 'webm'), {
      type: 'video/webm'
    });
    
    // Clean up files
    await this.ffmpeg.deleteFile(outputFileName);
    
    return outputFile;
  }

  private async compressToMP4(
    inputFile: File,
    inputFileName: string,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    const outputFileName = 'output.mp4';
    
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }
    
    // MP4 compression with H.264 codec - optimized for web and memory usage
    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libx264', // H.264 codec for MP4
      '-crf', '30', // Quality setting (higher = smaller file, less memory)
      '-preset', 'fast', // Faster encoding, less memory usage
      '-profile:v', 'baseline', // Baseline profile for better compatibility and less memory
      '-level', '3.1', // Lower level for less memory usage
      '-c:a', 'aac', // AAC audio codec for MP4
      '-b:a', '96k', // Lower audio bitrate to save memory
      '-movflags', '+faststart', // Optimize for streaming (moov atom at beginning)
      '-pix_fmt', 'yuv420p', // Pixel format for maximum compatibility
      '-threads', '2', // Limit threads to reduce memory usage
      '-y', // Overwrite output file
      outputFileName
    ]);
    
    // Read the output file
    const outputData = await this.ffmpeg.readFile(outputFileName);
    
    // Convert to Blob and create File
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
    const outputFile = new File([outputBlob], this.getOutputFileName(inputFile.name, 'mp4'), {
      type: 'video/mp4'
    });
    
    // Clean up files
    await this.ffmpeg.deleteFile(outputFileName);
    
    return outputFile;
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
  
  private getOutputFileName(originalName: string, format: 'webm' | 'mp4' = 'webm'): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_compressed.${format}`;
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
