# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Convertr is a client-side video processing platform built with SvelteKit that compresses videos using FFmpeg.js, uploads them to Google Drive, and generates shortened sharing links via TinyURL.

## Development Commands

```bash
# Development
npm run dev          # Start dev server with host binding
npm run build        # Production build
npm run preview      # Preview production build

# Quality Assurance
npm run check        # TypeScript and Svelte checks
npm run check:watch  # Watch mode for checks
npm run lint         # ESLint + Prettier validation
npm run format       # Auto-format code with Prettier
```

## Architecture

### Service Layer Pattern
The application uses a layered architecture with distinct service layers:

- **VideoProcessingService** (`src/lib/services/videoProcessing.ts`) - Main orchestration service
- **VideoProcessor** (`src/lib/utils/ffmpeg.ts`) - FFmpeg wrapper for video compression
- **Google Drive Service** (`src/lib/utils/googleDrive.ts`) - File upload handling
- **TinyURL Service** (`src/lib/utils/tinyurl.ts`) - Link shortening

### State Management
Uses Svelte stores for state management:
- **Auth Store** (`src/lib/stores/auth.ts`) - User authentication state
- **Video Store** (`src/lib/stores/video.ts`) - Processing queue management

### Processing Pipeline
1. File validation (format, size, MIME type)
2. Client-side FFmpeg compression (WebM/MP4 output)
3. Optional Google Drive upload with resumable uploads
4. Optional TinyURL link generation

## Key Technical Considerations

### FFmpeg Integration
- Uses dual loading strategy: local static files (`/static/ffmpeg/`) with CDN fallback
- Memory-optimized with limited threads and optimized codec settings
- Comprehensive error handling and recovery mechanisms
- Prefers WebM (VP9) output, falls back to MP4 (H.264)

### Environment Variables
All API keys are prefixed with `VITE_` for client-side access:
- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Google Drive: `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_CLIENT_ID`
- TinyURL: `VITE_TINYURL_API_KEY`

### Configuration Files
- **svelte.config.js** - SvelteKit with Vercel adapter, Node.js 20.x requirement
- **vite.config.ts** - Excludes FFmpeg from optimization, allows parent directory access
- **tailwind.config.js** - Custom theme with animations and specialized plugins

### Static Assets
FFmpeg WebAssembly files are hosted locally in `/static/ffmpeg/` to avoid CORS issues with CDN loading.

## File Structure

```
src/
├── lib/
│   ├── components/     # Svelte UI components
│   ├── services/      # Business logic layer
│   ├── stores/        # Svelte stores for state management
│   ├── utils/         # Utility functions and API clients
│   └── supabase.ts    # Database configuration
├── routes/            # SvelteKit file-based routing
└── app.html          # HTML template
```

## Deployment

- Target platform: Vercel with Node.js 20.x runtime
- All processing happens client-side, no server-side file storage
- 50MB file size limit with optimized encoding settings
- Progressive enhancement with graceful degradation when services unavailable