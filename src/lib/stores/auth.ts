import { writable } from 'svelte/store';
import { supabase, getCurrentUser } from '$lib/supabase';
import { browser } from '$app/environment';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  googleDriveQuota?: {
    used: number;
    total: number;
  };
}

export const currentUser = writable<User | null>(null);
export const isAuthenticated = writable<boolean>(false);
export const authLoading = writable<boolean>(true);

// Helper functions
export function setUser(user: User | null) {
  currentUser.set(user);
  isAuthenticated.set(!!user);
}

export function setAuthLoading(loading: boolean) {
  authLoading.set(loading);
}

// Initialize auth state
if (browser) {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      setUser(transformSupabaseUser(session.user));
    }
    setAuthLoading(false);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      setUser(transformSupabaseUser(session.user));
    } else {
      setUser(null);
    }
    setAuthLoading(false);
  });
}

function transformSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    avatar: supabaseUser.user_metadata?.avatar_url
  };
}
