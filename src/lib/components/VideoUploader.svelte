<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { appConfig } from '$lib/stores/video';
  
  const dispatch = createEventDispatcher();
  
  let dragActive = false;
  let fileInput: HTMLInputElement;
  let selectedFile: File | null = null;
  let errorMessage = '';
  
  $: maxSize = $appConfig.maxFileSize;
  $: supportedFormats = $appConfig.supportedFormats;
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function validateFile(file: File): string | null {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return `Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`;
    }
    
    if (file.size > maxSize) {
      return `File size too large. Maximum size: ${formatFileSize(maxSize)}`;
    }
    
    return null;
  }
  
  function handleFileSelect(file: File) {
    const error = validateFile(file);
    if (error) {
      errorMessage = error;
      selectedFile = null;
      return;
    }
    
    errorMessage = '';
    selectedFile = file;
    dispatch('fileSelected', { file });
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragActive = true;
  }
  
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
  }
  
  function openFileDialog() {
    fileInput.click();
  }
  
  function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }
  
  function clearSelection() {
    selectedFile = null;
    errorMessage = '';
    if (fileInput) {
      fileInput.value = '';
    }
  }
</script>

<div class="card">
  <div class="text-center">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Upload Your Video</h2>
    <p class="text-gray-600 mb-6">Drag and drop your video file or click to browse</p>
    
    <!-- Upload Area -->
    <div 
      class="relative border-2 border-dashed rounded-lg p-8 transition-colors duration-200 {dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      role="button"
      tabindex="0"
      on:click={openFileDialog}
      on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
    >
      <input
        bind:this={fileInput}
        type="file"
        accept=".mp4,.avi,.mov,.mkv,.webm"
        class="hidden"
        on:change={handleFileInput}
      />
      
      {#if selectedFile}
        <!-- Selected File Display -->
        <div class="space-y-4">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p class="text-lg font-medium text-gray-900">{selectedFile.name}</p>
            <p class="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            class="btn-primary"
            on:click|stopPropagation={() => dispatch('startProcessing', { file: selectedFile })}
          >
            Start Processing
          </button>
          <button
            type="button"
            class="btn-secondary ml-2"
            on:click|stopPropagation={clearSelection}
          >
            Choose Different File
          </button>
        </div>
      {:else}
        <!-- Upload Prompt -->
        <div class="space-y-4">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <svg class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p class="text-lg font-medium text-gray-900">Click to upload or drag and drop</p>
            <p class="text-sm text-gray-500">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
            <p class="text-sm text-gray-500">
              Supported formats: {supportedFormats.join(', ')}
            </p>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Error Message -->
    {#if errorMessage}
      <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
