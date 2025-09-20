import { supabase, type Database } from '$lib/supabase';
import { browser } from '$app/environment';

type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row'];
type ProcessingJobInsert = Database['public']['Tables']['processing_jobs']['Insert'];
type ProcessingJobUpdate = Database['public']['Tables']['processing_jobs']['Update'];

export class DatabaseService {
  async createProcessingJob(jobData: Omit<ProcessingJobInsert, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { data, error } = await supabase
      .from('processing_jobs')
      .insert({
        ...jobData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating processing job:', error);
      throw new Error('Failed to create processing job');
    }

    return data.id;
  }

  async updateProcessingJob(jobId: string, updates: ProcessingJobUpdate): Promise<void> {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { error } = await supabase
      .from('processing_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating processing job:', error);
      throw new Error('Failed to update processing job');
    }
  }

  async getProcessingJob(jobId: string): Promise<ProcessingJob | null> {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Job not found
      }
      console.error('Error getting processing job:', error);
      throw new Error('Failed to get processing job');
    }

    return data;
  }

  async getUserProcessingJobs(userId: string, limit: number = 50): Promise<ProcessingJob[]> {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user processing jobs:', error);
      throw new Error('Failed to get processing jobs');
    }

    return data || [];
  }

  async deleteProcessingJob(jobId: string): Promise<void> {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { error } = await supabase
      .from('processing_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting processing job:', error);
      throw new Error('Failed to delete processing job');
    }
  }

  async getUserPreferences(userId: string) {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to get user preferences');
    }

    return data;
  }

  async updateUserPreferences(userId: string, preferences: Partial<Database['public']['Tables']['user_preferences']['Update']>) {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  async createUserProfile(userId: string, email: string, fullName?: string) {
    if (!browser) {
      throw new Error('Database operations can only be performed in the browser');
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  // Real-time subscriptions
  subscribeToProcessingJobs(userId: string, callback: (job: ProcessingJob) => void) {
    if (!browser) {
      return { unsubscribe: () => {} };
    }

    return supabase
      .channel('processing_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as ProcessingJob);
        }
      )
      .subscribe();
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
