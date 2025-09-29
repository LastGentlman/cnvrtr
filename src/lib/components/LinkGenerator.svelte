<script lang="ts">
  import type { VideoFile } from '$lib/stores/video';
  import { formatFileSize } from '$lib/utils/format';
  import { tinyUrlService } from '$lib/utils/tinyurl';
  
  export let video: VideoFile;
  
  let shareUrl = '';
  let downloadUrl = '';
  let linkCopied = false;
  let isGeneratingLink = false;
  
  async function generateShareLink() {
    if (isGeneratingLink) return;
    
    isGeneratingLink = true;
    
    try {
      // Prefer an existing share URL if already generated upstream
      if (video.shareUrl) {
        shareUrl = video.shareUrl;
      } else if (video.downloadUrl && /^https?:\/\//.test(video.downloadUrl)) {
        // If there is a real, publicly accessible URL, shorten it via TinyURL (no static alias)
        const { shortUrl } = await tinyUrlService.shortenUrl(video.downloadUrl);
        shareUrl = shortUrl;
        video.shareUrl = shortUrl;
      } else {
        // No real shareable URL available. Keep shareUrl empty.
        console.warn('No shareable URL available to shorten. Ensure upload/sharing is enabled.');
      }
      
      // Generate download URL
      if (video.processedFile) {
        downloadUrl = URL.createObjectURL(video.processedFile);
        video.downloadUrl = downloadUrl;
      }
      
    } catch (error) {
      console.error('Error generating share link:', error);
    } finally {
      isGeneratingLink = false;
    }
  }
  
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      linkCopied = true;
      setTimeout(() => {
        linkCopied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
  
  function downloadFile() {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = video.name.replace(/\.[^/.]+$/, '_compressed.mp4');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
</script>

<div class="card">
  <div class="text-center">
    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
      <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Processing Complete!</h2>
    <p class="text-gray-600 mb-6">Your video has been compressed and is ready for sharing.</p>
    
    <!-- Compression Summary -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="text-center">
          <p class="text-gray-500">Original Size</p>
          <p class="font-semibold text-gray-900">{formatFileSize(video.size)}</p>
        </div>
        <div class="text-center">
          <p class="text-gray-500">Compressed Size</p>
          <p class="font-semibold text-gray-900">
            {video.processedFile ? formatFileSize(video.processedFile.size) : 'N/A'}
          </p>
        </div>
      </div>
      {#if video.compressionRatio}
        <div class="mt-3 text-center">
          <p class="text-sm text-gray-500">Size Reduction</p>
          <p class="text-lg font-bold text-green-600">
            {Math.round((1 - video.compressionRatio) * 100)}%
          </p>
        </div>
      {/if}
    </div>
    
    <!-- Action Buttons -->
    <div class="space-y-4">
      <!-- Generate Share Link -->
      {#if !shareUrl}
        <button
          class="btn-primary w-full"
          on:click={generateShareLink}
          disabled={isGeneratingLink}
        >
          {#if isGeneratingLink}
            <div class="flex items-center justify-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Link...
            </div>
          {:else}
            Generate Share Link
          {/if}
        </button>
      {:else}
        <!-- Share Link Display -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2">
            <input
              type="text"
              value={shareUrl}
              readonly
              class="flex-1 input-field bg-gray-50"
            />
            <button
              class="btn-secondary"
              on:click={() => copyToClipboard(shareUrl)}
            >
              {#if linkCopied}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              {:else}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              {/if}
            </button>
          </div>
          
          {#if linkCopied}
            <p class="text-sm text-green-600 text-center">Link copied to clipboard!</p>
          {/if}
        </div>
      {/if}
      
      <!-- Download Button -->
      {#if video.processedFile}
        <button
          class="btn-secondary w-full"
          on:click={downloadFile}
        >
          <div class="flex items-center justify-center">
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Compressed Video
          </div>
        </button>
      {/if}
    </div>
    
  </div>
</div>
