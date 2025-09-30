<script lang="ts">
  import { onMount } from 'svelte';
  import VideoUploader from '$lib/components/VideoUploader.svelte';
  import VideoPreview from '$lib/components/VideoPreview.svelte';
  import { currentVideo } from '$lib/stores/video';
  import { videoProcessingService } from '$lib/services/videoProcessing';
  import type { VideoFile } from '$lib/stores/video';
  import { browser } from '$app/environment';
  import { googleDriveService } from '$lib/utils/googleDrive';
  
  // Declare props to avoid warnings
  export const data: any = undefined;
  export const params: any = undefined;
  
  let showPreview = false;
  let isProcessing = false;
  let isDriveAuthorized = false;
  
  $: hasCompletedVideo = $currentVideo && $currentVideo.status === 'completed';
  
  async function handleFileSelected(event: CustomEvent) {
    const { file } = event.detail;
    console.log('File selected:', file.name);
  }
  
  async function handleCancel() {
    try {
      await videoProcessingService.cancelProcessing();
    } catch {}
    currentVideo.set(null);
    showPreview = false;
    isProcessing = false;
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
      // No mostramos el preview hasta finalizar
      showPreview = false;
      
      // Start real video processing
      console.log('Starting video processing...');
      console.log('Note: First-time processing may take longer as FFmpeg loads...');
      
      const task = await videoProcessingService.processVideo(file, {
        quality: 0.8,
        enableGoogleDrive: true,
        enableTinyUrl: true,
        preferredFormat: 'mp4', // Prefer MP4 to reduce wasm memory use
      });
      
      // Update video status
      currentVideo.update(v => v ? { 
        ...v, 
        status: 'completed', 
        progress: 100,
        processedFile: undefined,
        downloadUrl: task.downloadUrl,
        shareUrl: task.shareUrl,
        processingTime: task.processingTime,
        compressedSize: task.compressedSize,
        compressionRatio: task.compressedSize ? (task.compressedSize / v.size) : undefined
      } : null);
      showPreview = true;
      
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
  </div>

  <!-- Main Content -->
  <div class="max-w-4xl mx-auto">
    <!-- Upload Section -->
    <div class="mb-8">
      {#if isDriveAuthorized}
        <VideoUploader 
          on:fileSelected={handleFileSelected}
          on:startProcessing={handleStartProcessing}
          on:cancel={handleCancel}
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

    

    <!-- Video Preview -->
    {#if showPreview && $currentVideo}
      <div class="mb-8">
        <VideoPreview video={$currentVideo} />
      </div>
    {/if}

  </div>
</div>