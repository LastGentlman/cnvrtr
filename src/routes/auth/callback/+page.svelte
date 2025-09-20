<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  onMount(() => {
    // Redirect to home page after successful authentication
    setTimeout(() => {
      goto('/');
    }, 1000);
  });
</script>

<svelte:head>
  <title>Authentication - Convertr</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
        Authentication Successful
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        You have been successfully authenticated. Redirecting to the application...
      </p>
      <div class="mt-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  </div>
</div>
