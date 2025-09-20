import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      processing_jobs: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          progress: number;
          original_size: number;
          compressed_size: number | null;
          processing_time: number | null;
          download_url: string | null;
          share_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          progress?: number;
          original_size: number;
          compressed_size?: number | null;
          processing_time?: number | null;
          download_url?: string | null;
          share_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          progress?: number;
          original_size?: number;
          compressed_size?: number | null;
          processing_time?: number | null;
          download_url?: string | null;
          share_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          compression_quality: number;
          enable_google_drive: boolean;
          enable_tinyurl: boolean;
          default_folder_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          compression_quality?: number;
          enable_google_drive?: boolean;
          enable_tinyurl?: boolean;
          default_folder_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          compression_quality?: number;
          enable_google_drive?: boolean;
          enable_tinyurl?: boolean;
          default_folder_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper functions
export async function getCurrentUser() {
  if (!browser) return null;
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
}

export async function signInWithGoogle() {
  if (!browser) return;
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) {
    console.error('Error signing in with Google:', error);
  }
}

export async function signOut() {
  if (!browser) return;
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
  }
}
