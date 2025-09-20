<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { currentUser, isAuthenticated, authLoading } from '$lib/stores/auth';
  import { signInWithGoogle, signOut } from '$lib/supabase';
  
  // Declare props to avoid warnings
  export const data: any = undefined;
  export const params: any = undefined;
  
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
          {#if $authLoading}
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          {:else if $isAuthenticated && $currentUser}
            <div class="flex items-center space-x-3">
              {#if $currentUser.avatar}
                <img 
                  src={$currentUser.avatar} 
                  alt={$currentUser.name}
                  class="h-8 w-8 rounded-full"
                />
              {:else}
                <div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span class="text-white text-sm font-medium">
                    {$currentUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              {/if}
              <span class="text-sm text-gray-700">{$currentUser.name}</span>
              <button
                on:click={signOut}
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          {:else}
            <button
              on:click={signInWithGoogle}
              class="btn-primary"
            >
              Sign In with Google
            </button>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </main>
</div>