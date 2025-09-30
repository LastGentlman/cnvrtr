<script lang="ts">
  import type { VideoFile } from '$lib/stores/video';
  import { formatFileSize, formatDuration } from '$lib/utils/format';
  
  export let video: VideoFile;
  
  let videoElement: HTMLVideoElement;
  let thumbnailGenerated = false;
  
  function generateThumbnail() {
    if (videoElement && !thumbnailGenerated) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 320;
        canvas.height = 180;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        video.thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        thumbnailGenerated = true;
      }
    }
  }
  
  function onVideoLoaded() {
    if (videoElement) {
      video.duration = videoElement.duration;
      generateThumbnail();
    }
  }
</script>

<div class="card">
  <h2 class="text-xl font-semibold text-gray-900 mb-6">Video Preview</h2>
  
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Video Player -->
    <div class="space-y-4">
      <div class="relative bg-black rounded-lg overflow-hidden">
        <video
          bind:this={videoElement}
          class="w-full h-auto max-h-64"
          controls
          preload="metadata"
          on:loadedmetadata={onVideoLoaded}
        >
          {#if video.status === 'completed' && video.downloadUrl}
            <source src={video.downloadUrl} />
          {:else if video.originalFile}
            <source src={URL.createObjectURL(video.originalFile)} type={video.originalFile.type} />
          {/if}
          <track kind="captions" src="" label="No captions available" srclang="en" default />
          Your browser does not support the video tag.
        </video>
        
        <!-- Processing Overlay -->
        {#if video.status === 'processing'}
          <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div class="text-center text-white">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p class="text-sm">Processing...</p>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Video Info -->
      <div class="space-y-2">
        <h3 class="font-medium text-gray-900">{video.name}</h3>
        <div class="flex items-center space-x-4 text-sm text-gray-500">
          <span>{formatFileSize(video.size)}</span>
          {#if video.duration}
            <span>{formatDuration(video.duration)}</span>
          {/if}
          <span class="capitalize">{video.type}</span>
        </div>
      </div>
    </div>
    
    <!-- Processing Details -->
    <div class="space-y-6">
      <!-- Status -->
      <div>
        <h4 class="font-medium text-gray-900 mb-3">Processing Status</h4>
        <div class="flex items-center space-x-2">
          <div class="flex-shrink-0">
            {#if video.status === 'completed'}
              <div class="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            {:else if video.status === 'processing'}
              <div class="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            {:else if video.status === 'error'}
              <div class="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                <svg class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            {:else}
              <div class="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg class="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            {/if}
          </div>
          <span class="text-sm font-medium text-gray-900 capitalize">{video.status}</span>
        </div>
      </div>
      
      <!-- Progress Bar -->
      {#if video.status === 'processing'}
        <div>
          <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>Processing Progress</span>
            <span>{Math.round(video.progress)}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style="width: {video.progress}%"
            ></div>
          </div>
        </div>
      {/if}
      
      <!-- Compression Stats -->
      {#if video.status === 'completed' && video.compressionRatio}
        <div>
          <h4 class="font-medium text-gray-900 mb-3">Compression Results</h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Original Size</span>
              <span class="text-sm font-medium text-gray-900">{formatFileSize(video.size)}</span>
            </div>
            {#if video.compressedSize}
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Compressed Size</span>
                <span class="text-sm font-medium text-gray-900">{formatFileSize(video.compressedSize)}</span>
              </div>
            {/if}
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Size Reduction</span>
              <span class="text-sm font-medium text-green-600">
                {Math.round((1 - video.compressionRatio) * 100)}%
              </span>
            </div>
            {#if video.processingTime}
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Processing time:</span>
                <span class="text-sm font-medium text-gray-900">
                  {#if (video.processingTime / 1000) >= 60}
                    {Math.floor((video.processingTime / 1000) / 60)}m
                  {:else}
                    {Math.round(video.processingTime / 1000)}s
                  {/if}
                  {#if video.compressionRatio}
                    — {Math.round((1 - video.compressionRatio) * 100)}% smaller
                  {/if}
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Error Message -->
      {#if video.status === 'error' && video.error}
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Processing Error</h3>
              <p class="mt-1 text-sm text-red-700">{video.error}</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
