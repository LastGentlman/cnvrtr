# Convertr - Video Processing Platform

A modern, client-side video processing platform built with SvelteKit that compresses videos, uploads them to Google Drive, and generates shortened sharing links.

## Features

- 🎥 **Client-side Video Processing** - Uses FFmpeg.js for browser-based video compression
- 📁 **Google Drive Integration** - Automatic upload to Google Drive with resumable uploads
- 🔗 **URL Shortening** - Bitly integration for shortened sharing links
- ⚡ **Real-time Progress** - Live progress tracking during processing
- 📱 **Responsive Design** - Modern UI built with Tailwind CSS
- 🔒 **Secure** - Client-side processing with secure API integrations

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Styling**: Tailwind CSS
- **Video Processing**: FFmpeg.js (WASM)
- **Storage**: Google Drive API v3
- **URL Shortening**: Bitly API v4
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Platform account (for Google Drive API)
- Bitly account (for URL shortening)

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

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your API keys:
   ```env
   VITE_GOOGLE_API_KEY=your_google_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   VITE_BITLY_ACCESS_TOKEN=your_bitly_access_token_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## API Setup

### Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API
4. Create credentials (API Key and OAuth 2.0 Client ID)
5. Add your domain to authorized origins

### Bitly API

1. Sign up at [Bitly](https://bitly.com/)
2. Go to Settings > API
3. Generate an access token
4. Optionally set up a custom domain

## Usage

1. **Upload Video**: Drag and drop or click to select a video file
2. **Processing**: The video is compressed client-side using FFmpeg.js
3. **Upload**: Compressed video is uploaded to Google Drive
4. **Share**: A shortened link is generated using Bitly
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
- `bitly.ts` - Bitly API client

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
- `VITE_BITLY_ACCESS_TOKEN`

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

3. **Bitly link generation fails**
   - Verify access token
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