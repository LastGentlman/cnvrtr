<script lang="ts">
  import { onMount } from 'svelte';
  import VideoUploader from '$lib/components/VideoUploader.svelte';
  import ProcessingQueue from '$lib/components/ProcessingQueue.svelte';
  import VideoPreview from '$lib/components/VideoPreview.svelte';
  import LinkGenerator from '$lib/components/LinkGenerator.svelte';
  import { processingQueue, currentVideo } from '$lib/stores/video';
  import { videoProcessingService } from '$lib/services/videoProcessing';
  import type { VideoFile } from '$lib/stores/video';
  import { browser } from '$app/environment';
  
  // Declare props to avoid warnings
  export const data: any = undefined;
  export let params: any = undefined;
  
  let showPreview = false;
  let showLinkGenerator = false;
  let isProcessing = false;
  
  $: hasProcessingTasks = $processingQueue.length > 0;
  $: hasCompletedVideo = $currentVideo && $currentVideo.status === 'completed';
  
  async function handleFileSelected(event: CustomEvent) {
    const { file } = event.detail;
    console.log('File selected:', file.name);
  }
  
  async function handleStartProcessing(event: CustomEvent) {
    const { file } = event.detail;
    
    if (!browser) {
      alert('Video processing is only available in the browser.');
      return;
    }
    
    if (isProcessing) {
      alert('Another video is currently being processed. Please wait.');
      return;
    }
    
    isProcessing = true;
    
    try {
      // Create video object
      const video: VideoFile = {
        id: `video_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
        originalFile: file,
      };
      
      currentVideo.set(video);
      showPreview = true;
      
      // Start real video processing
      console.log('Starting video processing...');
      console.log('Note: First-time processing may take longer as FFmpeg loads...');
      
      await videoProcessingService.processVideo(file, {
        quality: 0.8,
        enableGoogleDrive: false, // Disable for now due to API setup
        enableTinyUrl: false, // Disable for now due to API setup
        preferredFormat: 'webm', // Use WebM as default, with MP4 fallback
      });
      
      // Update video status
      currentVideo.update(v => v ? { ...v, status: 'completed', progress: 100 } : null);
      showLinkGenerator = true;
      
    } catch (error) {
      console.error('Video processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      currentVideo.update(v => v ? { 
        ...v, 
        status: 'error', 
        error: errorMessage 
      } : null);
      
      // Show user-friendly error message
      if (errorMessage.includes('Failed to initialize video processor') || 
          errorMessage.includes('All loading methods failed') ||
          errorMessage.includes('FFmpeg load timeout')) {
        alert(`Video processing failed: ${errorMessage}\n\nThis is likely due to network issues or CDN problems. Please:\n1. Check your internet connection\n2. Try refreshing the page\n3. Try again in a few minutes\n\nIf the problem persists, the video processing service may be temporarily unavailable.`);
      } else if (errorMessage.includes('too large or complex for processing')) {
        alert(`Video processing failed: ${errorMessage}\n\nPlease try:\n1. Using a smaller video file (under 50MB)\n2. Reducing the video resolution\n3. Using a shorter video\n4. Converting to MP4 format first\n\nLarge or complex videos may exceed browser memory limits.`);
      } else {
        alert(`Video processing failed: ${errorMessage}\n\nPlease check your internet connection and try again.`);
      }
    } finally {
      isProcessing = false;
    }
  }
</script>

<svelte:head>
  <title>Convertr - Video Processing Platform</title>
  <meta name="description" content="Compress, convert, and share videos with ease. Upload your videos and get optimized, shareable links in minutes." />
</svelte:head>

<div class="px-4 py-6 sm:px-0">
  <!-- Hero Section -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
      <span class="block">Video Processing</span>
      <span class="block text-blue-600">Made Simple</span>
    </h1>
    <p class="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
      Upload your videos, compress them for optimal sharing, and get shortened links automatically. 
      Perfect for teams and organizations.
    </p>
    
    <!-- Processing Notice -->
    <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-2xl mx-auto">
      <div class="flex items-center justify-center">
        <svg class="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-green-800">
          <strong>Real Processing:</strong> Videos are processed using FFmpeg with WebM/MP4 optimization. First upload may take longer as the processor loads.
        </p>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-4xl mx-auto">
    <!-- Upload Section -->
    <div class="mb-8">
      <VideoUploader 
        on:fileSelected={handleFileSelected}
        on:startProcessing={handleStartProcessing}
      />
    </div>

    <!-- Processing Queue -->
    {#if hasProcessingTasks}
      <div class="mb-8">
        <ProcessingQueue />
      </div>
    {/if}

    <!-- Video Preview -->
    {#if showPreview && $currentVideo}
      <div class="mb-8">
        <VideoPreview video={$currentVideo} />
      </div>
    {/if}

    <!-- Link Generator -->
    {#if showLinkGenerator && $currentVideo}
      <div class="mb-8">
        <LinkGenerator video={$currentVideo} />
      </div>
    {/if}
  </div>

  <!-- Features Section -->
  <div class="mt-16">
    <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <div class="card text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Smart Compression</h3>
        <p class="text-gray-500">Reduce file sizes by 30-50% while maintaining visual quality using VP9 and H.264 codecs.</p>
      </div>

      <div class="card text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Lightning Fast</h3>
        <p class="text-gray-500">Process videos in minutes, not hours. Real-time compression using FFmpeg for maximum speed.</p>
      </div>

      <div class="card text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Easy Sharing</h3>
        <p class="text-gray-500">Automatic Google Drive upload and shortened links for seamless sharing.</p>
      </div>
    </div>
  </div>
</div>