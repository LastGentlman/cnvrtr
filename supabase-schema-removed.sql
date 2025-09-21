-- Remove Convertr Database Schema (No Database Required)
-- Run this in your Supabase SQL editor to clean up unused tables

-- Drop tables if they exist
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.processing_jobs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Note: This removes all database functionality
-- The application will work entirely in memory without persistence
