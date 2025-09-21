<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  
  // Declare props to avoid warnings
  export const data: any = undefined;
  export let params: any = undefined;
  
  onMount(() => {
    // Initialize app state
    console.log('Video Processing Platform initialized');
  });
</script>

<div class="min-h-full">
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <h1 class="text-2xl font-bold text-blue-600">Convertr</h1>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">Internal Video Processing Tool</span>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </main>
</div>