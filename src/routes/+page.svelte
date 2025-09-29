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
  import { googleDriveService } from '$lib/utils/googleDrive';
  
  // Declare props to avoid warnings
  export const data: any = undefined;
  export const params: any = undefined;
  
  let showPreview = false;
  let showLinkGenerator = false;
  let isProcessing = false;
  let isDriveAuthorized = false;
  
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
        enableGoogleDrive: true,
        enableTinyUrl: true,
        preferredFormat: 'mp4', // Prefer MP4 to reduce wasm memory use
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

  async function checkDriveAuth() {
    if (!browser) return;
    try {
      const resp = await fetch('/auth/google-drive/token', { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        googleDriveService.setAccessToken(data.access_token, data.expires_in ?? 3600);
        isDriveAuthorized = true;
      } else {
        isDriveAuthorized = false;
      }
    } catch (e) {
      isDriveAuthorized = false;
    }
  }

  function startDriveAuth() {
    if (!browser) return;
    window.location.href = '/auth/google-drive/start';
  }

  onMount(() => {
    checkDriveAuth();
  });
</script>

<svelte:head>
  <title>Convertr - Video Processing Platform</title>
  <meta name="description" content="Compress, convert, and share videos with ease. Upload your videos and get optimized, shareable links in minutes." />
</svelte:head>

<div class="px-4 py-6 sm:px-0">
  <!-- Hero Section -->
  <div class="text-center mb-12">
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
      {#if isDriveAuthorized}
        <VideoUploader 
          on:fileSelected={handleFileSelected}
          on:startProcessing={handleStartProcessing}
        />
      {:else}
        <div class="card text-center">
          <div class="space-y-4">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Conecta Google Drive</h2>
              <p class="text-gray-600">Paso 1: Otorga permiso a Google Drive para subir y compartir tus videos. Luego se desbloqueará el cargador.</p>
            </div>
            <div>
              <button type="button" class="btn-primary" on:click={startDriveAuth}>
                Conectar Google Drive
              </button>
              <p class="text-xs text-gray-500 mt-2">Solicitamos el alcance mínimo necesario: drive.file (crear/gestionar archivos creados por esta app).</p>
            </div>
          </div>
        </div>
      {/if}
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
</div>