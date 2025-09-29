# Convertr - Video Processing Platform

A modern, client-side video processing platform built with SvelteKit that compresses videos, uploads them to Google Drive, and generates shortened sharing links.

## Features

- 🎥 **Client-side Video Processing** - Uses FFmpeg.js for browser-based video compression
- 📁 **Google Drive Integration** - Automatic upload to Google Drive with resumable uploads
- 🔗 **URL Shortening** - TinyURL integration for shortened sharing links
- ⚡ **Real-time Progress** - Live progress tracking during processing
- 📱 **Responsive Design** - Modern UI built with Tailwind CSS
- 🔒 **Secure** - Client-side processing with secure API integrations

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Styling**: Tailwind CSS
- **Video Processing**: FFmpeg.js (WASM)
- **Storage**: Google Drive API v3
- **URL Shortening**: TinyURL API
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database and authentication)
- Google Cloud Platform account (for Google Drive API)
- TinyURL account (for URL shortening)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd convertr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings → API to get your project URL and anon key
   - Run the SQL schema in the SQL editor:
     ```bash
   cat supabase-schema.sql
   ```
   - Copy and paste the contents into your Supabase SQL editor

4. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your API keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_GOOGLE_API_KEY=your_google_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   VITE_TINYURL_API_KEY=your_tinyurl_api_key_here
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## API Setup

### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in Authentication → Providers
3. Add your domain to the allowed redirect URLs
4. Run the provided SQL schema to create tables and policies

### Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API
4. Create credentials:
   - API Key (restrict to Drive API)
   - OAuth 2.0 Client ID (Web)
5. Add your domain to Authorized JavaScript origins
6. Add callback URL to Authorized redirect URIs:
   - `https://yourdomain.com/auth/google-drive/callback`

### TinyURL API

1. Sign up at [TinyURL](https://tinyurl.com/)
2. Go to Developer Portal to get your API key
3. The API key is optional for basic URL shortening
4. For advanced features, you may need a paid plan

## Usage

1. **Upload Video**: Drag and drop or click to select a video file
2. **Processing**: The video is compressed client-side using FFmpeg.js
3. **Upload**: Compressed video is uploaded to Google Drive
4. **Share**: A shortened link is generated using TinyURL
5. **Download**: Access the compressed video or share the link

## Supported Formats

- **Input**: MP4, AVI, MOV, MKV, WebM
- **Output**: MP4 (H.264/AAC)
- **Max Size**: 200MB

## Performance

- **Compression**: 30-50% size reduction
- **Processing Time**: <15 minutes for 200MB files
- **Memory Usage**: <2GB RAM during processing

## Development

### Project Structure

```
src/
├── lib/
│   ├── components/          # Svelte components
│   ├── services/           # Business logic
│   ├── stores/             # Svelte stores
│   └── utils/              # Utility functions
├── routes/                 # SvelteKit routes
└── app.html               # HTML template
```

### Key Components

- `VideoUploader.svelte` - File upload with drag & drop
- `ProcessingQueue.svelte` - Real-time processing status
- `VideoPreview.svelte` - Video preview and info
- `LinkGenerator.svelte` - Final output with sharing

### Services

- `videoProcessing.ts` - Main processing orchestration
- `ffmpeg.ts` - FFmpeg.js integration
- `googleDrive.ts` - Google Drive API client
- `tinyurl.ts` - TinyURL API client

## Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
npm run preview
```

### Environment Variables for Production

Set the following environment variables in your deployment platform:

- `VITE_GOOGLE_API_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_SECRET`
- `VITE_TINYURL_API_KEY`

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Note**: FFmpeg.js requires WebAssembly support.

## Security Considerations

- All processing happens client-side
- API keys are exposed to the client (use restricted keys)
- Files are temporarily stored in browser memory
- No server-side file storage

## Troubleshooting

### Common Issues

1. **FFmpeg.js fails to load**
   - Check browser WebAssembly support
   - Ensure stable internet connection
   - Try refreshing the page

2. **Google Drive upload fails**
   - Verify API key and client ID
   - Check domain authorization
   - Ensure Drive API is enabled

3. **TinyURL link generation fails**
   - Verify API key (optional for basic usage)
   - Check API rate limits
   - Ensure account is active

### Performance Tips

- Use smaller files for testing
- Close other browser tabs during processing
- Ensure stable internet connection
- Use modern browsers for best performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review browser console for errors

---

Built with ❤️ using SvelteKit and modern web technologies.