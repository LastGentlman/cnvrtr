<script lang="ts">
  import { processingQueue } from '$lib/stores/video';
  import { tinyUrlService } from '$lib/utils/tinyurl';

  async function copyShareLink(url: string) {
    if (!url) return;
    let toCopy = url;
    try {
      const isAlreadyShort = /tinyurl\.com\//i.test(url);
      if (!isAlreadyShort) {
        const { shortUrl } = await tinyUrlService.shortenUrl(url);
        toCopy = shortUrl;
      }
    } catch (e) {
      // Fallback to original URL on any error
    } finally {
      await navigator.clipboard.writeText(toCopy);
    }
  }
  import { formatFileSize } from '$lib/utils/format';
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
  
  function getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'processing': return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
      case 'completed': return 'M5 13l4 4L19 7';
      case 'error': return 'M6 18L18 6M6 6l12 12';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
</script>

<div class="card">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-semibold text-gray-900">Processing Queue</h2>
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {$processingQueue.length} {($processingQueue.length === 1) ? 'task' : 'tasks'}
    </span>
  </div>
  
  {#if $processingQueue.length === 0}
    <div class="text-center py-8">
      <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
        <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-gray-500">No videos in processing queue</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each $processingQueue as task (task.id)}
        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div class="h-8 w-8 rounded-full flex items-center justify-center {getStatusColor(task.status)}">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getStatusIcon(task.status)} />
                  </svg>
                </div>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {task.file.name}
                </p>
                <p class="text-xs text-gray-500">
                  {formatFileSize(task.originalSize)}
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusColor(task.status)}">
                {task.status}
              </span>
              {#if task.status === 'completed' && task.compressedSize}
                <span class="text-xs text-gray-500">
                  {Math.round((1 - task.compressedSize / task.originalSize) * 100)}% smaller
                </span>
              {/if}
            </div>
          </div>
          
          <!-- Progress Bar -->
          {#if task.status === 'processing' || task.status === 'completed'}
            <div class="mb-3">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(task.progress)}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style="width: {task.progress}%"
                ></div>
              </div>
            </div>
          {/if}
          
          <!-- Error Message -->
          {#if task.status === 'error' && task.error}
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-800">{task.error}</p>
            </div>
          {/if}
          
          <!-- Processing Time -->
          {#if task.processingTime}
            <div class="mt-3 text-xs text-gray-500">
              {#if (task.processingTime / 1000) >= 60}
                Processing time: {Math.floor((task.processingTime / 1000) / 60)}m
              {:else}
                Processing time: {Math.round(task.processingTime / 1000)}s
              {/if}
            </div>
          {/if}
          
          <!-- Action Buttons -->
          {#if task.status === 'completed'}
            <div class="mt-3 flex space-x-2">
              {#if task.downloadUrl}
                <a 
                  href={task.downloadUrl} 
                  download
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </a>
              {/if}
              {#if task.shareUrl}
                <button
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  on:click={() => copyShareLink(task.shareUrl || '')}
                >
                  <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Copy Link
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
