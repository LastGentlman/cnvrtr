-- Simplified Convertr Database Schema (No Authentication Required)
-- Run this in your Supabase SQL editor if you want to use database features

-- Create processing_jobs table (without user authentication)
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  original_size BIGINT NOT NULL,
  compressed_size BIGINT,
  processing_time INTEGER, -- in milliseconds
  download_url TEXT,
  share_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON public.processing_jobs(created_at DESC);

-- Disable RLS since we're not using authentication
ALTER TABLE public.processing_jobs DISABLE ROW LEVEL SECURITY;

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
