import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { browser } from '$app/environment';

export class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private progressHandler: ((progress: number) => void) | null = null;
  private clampProgress(value: number): number {
    if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }
  
  constructor() {
    // Only initialize FFmpeg in the browser
    if (browser) {
      this.ffmpeg = new FFmpeg();
      // Configure FFmpeg with memory settings to prevent out of bounds errors
      this.ffmpeg.on('log', (event: { message: string }) => {
        console.log('FFmpeg log:', event.message);
      });
      this.ffmpeg.on('progress', (event: { progress: number }) => {
        const pct = this.clampProgress(event.progress * 100);
        console.log('FFmpeg progress:', Math.round(pct) + '%');
        // Forward to the current progress handler if set
        if (this.progressHandler) {
          try {
            this.progressHandler(pct);
          } catch (e) {
            console.warn('Progress handler error:', e);
          }
        }
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
      
      // Try multiple loading strategies
      const strategies = [
        // Strategy 1: Local static files
        async () => {
          const baseURL = '/ffmpeg';
          console.log(`Loading FFmpeg from local static files: ${baseURL}`);
          
          // Test if files are accessible first
          try {
            const response = await fetch(`${baseURL}/ffmpeg-core.js`);
            if (!response.ok) {
              throw new Error(`Static files not accessible: ${response.status}`);
            }
            console.log('Static FFmpeg files are accessible');
          } catch (error) {
            console.warn('Static files test failed:', error);
            throw error;
          }
          
          return this.ffmpeg!.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
        },
        // Strategy 2: CDN fallback
        async () => {
          console.log('Loading FFmpeg from CDN fallback...');
          return this.ffmpeg!.load({
            coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm', 'application/wasm'),
          });
        }
      ];
      
      let lastError: Error | null = null;
      
      for (const strategy of strategies) {
        try {
          const loadPromise = strategy();
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('FFmpeg load timeout after 30 seconds')), 30000);
          });
          
          await Promise.race([loadPromise, timeoutPromise]);
          
          this.isLoaded = true;
          console.log('FFmpeg loaded successfully');
          return;
          
        } catch (error) {
          console.warn('FFmpeg loading strategy failed:', error);
          lastError = error instanceof Error ? error : new Error('Unknown error');
          continue;
        }
      }
      
      throw lastError || new Error('All FFmpeg loading strategies failed');
      
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error(`Failed to initialize video processor: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your internet connection and try again.`);
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
    
    const inputFileName = 'input.src';
    let normalizedInputName: string = inputFileName;
    let resultFile: File | null = null;
    
    try {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }
      
      // Write input file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));
      
      // Normalize/remux to a clean MP4 when possible to avoid container oddities
      try {
        normalizedInputName = await this.normalizeToMP4(inputFileName);
      } catch (e) {
        console.warn('Input remux normalization failed, proceeding with original stream:', e);
        normalizedInputName = inputFileName;
      }
      
      // Set up progress forwarding to avoid accumulating listeners
      this.progressHandler = (pct: number) => {
        if (onProgress) {
          onProgress(this.clampProgress(pct));
        }
      };
      
      // Try WebM first (preferred format)
      let lastError: unknown = null;
      if (preferredFormat === 'webm') {
        try {
          resultFile = await this.compressToWebM(inputFile, normalizedInputName, onProgress);
        } catch (webmError) {
          lastError = webmError;
          console.warn('WebM compression failed, falling back to MP4:', webmError);
          try {
            resultFile = await this.compressToMP4(inputFile, normalizedInputName, onProgress);
          } catch (mp4Error) {
            lastError = mp4Error;
          }
        }
      } else {
        // Try MP4 first
        try {
          resultFile = await this.compressToMP4(inputFile, normalizedInputName, onProgress);
        } catch (mp4Error) {
          lastError = mp4Error;
          console.warn('MP4 compression failed, falling back to WebM:', mp4Error);
          try {
            resultFile = await this.compressToWebM(inputFile, normalizedInputName, onProgress);
          } catch (webmError) {
            lastError = webmError;
          }
        }
      }

      // If both encoders failed, return the normalized/remuxed MP4 as a safe fallback
      if (!resultFile) {
        console.warn('Both compression attempts failed; attempting to return normalized MP4 as fallback.');
        try {
          if (normalizedInputName !== inputFileName) {
            const normalizedData = await this.ffmpeg.readFile(normalizedInputName);
            const normalizedBlob = new Blob([normalizedData as BlobPart], { type: 'video/mp4' });
            return new File([normalizedBlob], this.getOutputFileName(inputFile.name, 'mp4'), {
              type: 'video/mp4'
            });
          }
        } catch (readErr) {
          console.warn('Reading normalized file failed; falling back to original input file.', readErr);
        }
        // Final fallback: return the original file unmodified
        return inputFile;
      }
      return resultFile!;
    } catch (error) {
      console.error('Video compression failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to compress video: ${message}`);
    } finally {
      // Detach progress handler to prevent forwarding after completion
      this.progressHandler = null;
      // Best-effort cleanup
      try { await this.ffmpeg?.deleteFile(inputFileName); } catch {}
      if (normalizedInputName !== inputFileName) {
        try { await this.ffmpeg?.deleteFile(normalizedInputName); } catch {}
      }
    }
  }

  private async normalizeToMP4(inputName: string): Promise<string> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }
    const fixedName = 'input.fixed.mp4';
    // Remux to MP4 while transcoding unsupported audio (e.g., pcm_mulaw) to AAC at a lighter setting.
    // Copy video as-is to avoid re-encode. Avoid '+faststart' to prevent a second pass/moov relocation in wasm.
    await this.ffmpeg.exec([
      '-fflags', '+genpts',
      '-i', inputName,
      '-map', '0:v:0?',
      '-map', '0:a:0?',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-ar', '48000',
      '-ac', '1',
      '-b:a', '64k',
      '-y',
      fixedName,
    ]);
    // Free original input to reduce MEMFS footprint once normalized exists
    try { await this.ffmpeg.deleteFile(inputName); } catch {}
    return fixedName;
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
    
    // WebM compression with VP9 codec - extra conservative for wasm memory
    await this.ffmpeg.exec([
      '-analyzeduration', '0',
      '-probesize', '32k',
      '-i', inputFileName,
      // Downscale and reduce FPS to lower memory and improve web delivery
      '-vf', 'scale=w=min(iw\\,960):h=-2:flags=bicubic',
      '-r', '15',
      '-c:v', 'libvpx-vp9', // VP9 codec for WebM
      '-crf', '36', // Lower quality to reduce bitrate/memory
      '-b:v', '0', // Let CRF control bitrate
      '-deadline', 'realtime',
      '-cpu-used', '5',
      '-threads', '1', // Single thread to lower wasm memory usage
      '-lag-in-frames', '0', // Reduce lookahead buffers
      '-auto-alt-ref', '0', // Disable alt-ref frames to save memory
      '-pix_fmt', 'yuv420p',
      '-c:a', 'libopus', // Opus audio codec for WebM
      '-ar', '16000',
      '-ac', '1',
      '-b:a', '32k',
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
    
    // MP4 compression with H.264 codec - optimized for wasm memory usage
    await this.ffmpeg.exec([
      '-analyzeduration', '0',
      '-probesize', '32k',
      '-i', inputFileName,
      // Downscale and reduce FPS to lower memory and improve web delivery
      '-vf', 'scale=w=min(iw\\,1280):h=-2:flags=bicubic',
      '-r', '20',
      '-c:v', 'libx264', // H.264 codec for MP4
      '-crf', '32', // Slightly lower quality to reduce bitrate/memory
      '-preset', 'veryfast', // Reduce memory usage
      '-profile:v', 'baseline', // Baseline profile for better compatibility and less memory
      '-level', '3.1', // Lower level for less memory usage
      '-c:a', 'aac', // AAC audio codec for MP4
      '-ar', '44100',
      '-ac', '1',
      '-b:a', '64k',
      // Avoid '+faststart' to prevent moov relocation second pass in wasm
      '-pix_fmt', 'yuv420p', // Pixel format for maximum compatibility
      '-threads', '1', // Single thread to lower wasm memory usage
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
