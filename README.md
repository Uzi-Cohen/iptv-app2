# IPTV Player

A modern, Disney+ inspired IPTV streaming application built with Electron, React, and TypeScript.

![IPTV Player](https://via.placeholder.com/800x450/0d1117/ffffff?text=IPTV+Player)

## Features

- **M3U/M3U8 Playlist Support** - Import playlists from URLs or local files
- **EPG Integration** - Electronic Program Guide with XMLTV support
- **HLS Streaming** - Full support for HTTP Live Streaming via hls.js
- **Disney+ Inspired UI** - Beautiful dark theme with horizontal scrolling carousels
- **Favorites & History** - Save your favorite channels and track watch history
- **Search** - Quick search across all channels
- **Channel Groups** - Automatic categorization by playlist groups
- **Cross-Platform** - Windows, macOS, and Linux support

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **HLS.js** - HLS video playback
- **SQLite** - Local database via better-sqlite3
- **Vite** - Fast development and build tool

## Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/iptv-player.git
cd iptv-player

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist
```

## Development

```bash
# Start development server (renderer)
npm run dev:renderer

# Start Electron in development
npm run dev:main

# Run both concurrently
npm run dev
```

## Project Structure

```
iptv-player/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Main entry point
│   │   ├── preload.ts     # Preload script
│   │   └── services/      # Backend services
│   │       ├── StorageService.ts
│   │       ├── PlaylistService.ts
│   │       ├── EPGService.ts
│   │       ├── ChannelService.ts
│   │       └── StreamService.ts
│   ├── renderer/          # React frontend
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # UI components
│   │   └── styles/        # CSS styles
│   └── shared/            # Shared types
│       └── types/
├── assets/                # App icons and images
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Key Components

### Backend Services

- **StorageService** - SQLite database operations for playlists, channels, EPG, favorites, and settings
- **PlaylistService** - M3U parsing and playlist management using @iptv/playlist
- **EPGService** - XMLTV EPG parsing and program scheduling using epg-parser
- **ChannelService** - Channel management, favorites, and history
- **StreamService** - Stream testing and format detection

### Frontend Components

- **VideoPlayer** - HLS video player with custom controls
- **ChannelCard** - Disney+ style channel cards with hover effects
- **ChannelRow** - Horizontal scrolling carousel for channel groups
- **Settings** - Comprehensive settings panel
- **AddPlaylistModal** - Modal for importing playlists

## Supported Formats

### Playlists
- M3U / M3U8
- Extended M3U with metadata (logos, groups, EPG IDs)
- Xtream Codes compatible

### Streaming Protocols
- HLS (HTTP Live Streaming)
- MPEG-TS
- MP4

### EPG
- XMLTV format (.xml, .xml.gz)

## Configuration

Settings are stored locally and include:

- **Playback** - Autoplay, hardware acceleration, buffer size
- **Audio** - Default volume
- **Appearance** - Channel numbers, remember last channel
- **Auto-refresh** - Playlist and EPG refresh intervals

## Building for Distribution

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist -- --mac
npm run dist -- --win
npm run dist -- --linux
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by [Megacubo](https://github.com/EdenwareApps/Megacubo) - A powerful IPTV streaming application.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
