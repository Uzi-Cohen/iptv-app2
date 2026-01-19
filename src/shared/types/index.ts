// Playlist types
export interface Playlist {
  id: string;
  name: string;
  url: string;
  filePath?: string;
  channelCount: number;
  lastUpdated: string;
  createdAt: string;
}

// Channel types
export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  language?: string;
  country?: string;
  playlistId: string;
  isFavorite: boolean;
  userAgent?: string;
  referrer?: string;
  catchup?: CatchupConfig;
}

export interface CatchupConfig {
  type: 'default' | 'flussonic' | 'xc' | 'shift';
  days?: number;
  source?: string;
}

export interface ChannelFilters {
  playlistId?: string;
  group?: string;
  search?: string;
  favoritesOnly?: boolean;
}

// EPG types
export interface EPGSource {
  id: string;
  url: string;
  lastUpdated: string;
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category?: string;
  icon?: string;
  rating?: string;
  episodeNum?: string;
  season?: number;
  episode?: number;
}

export interface EPGChannel {
  id: string;
  displayName: string;
  icon?: string;
  url?: string;
}

// Stream types
export interface StreamTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  type?: StreamType;
}

export interface StreamInfo {
  type: StreamType;
  url: string;
  resolution?: string;
  bitrate?: number;
  codec?: string;
  isLive?: boolean;
}

export type StreamType = 'hls' | 'dash' | 'mpegts' | 'mp4' | 'unknown';

// History types
export interface HistoryEntry {
  id: string;
  channelId: string;
  channel: Channel;
  timestamp: string;
  duration?: number;
}

// Settings types
export interface Settings {
  theme: 'dark' | 'light' | 'system';
  autoplay: boolean;
  volume: number;
  muted: boolean;
  bufferSize: number;
  epgRefreshInterval: number;
  playlistRefreshInterval: number;
  hardwareAcceleration: boolean;
  lowLatencyMode: boolean;
  showChannelNumbers: boolean;
  rememberLastChannel: boolean;
  lastChannelId?: string;
  language: string;
}

export const defaultSettings: Settings = {
  theme: 'dark',
  autoplay: true,
  volume: 100,
  muted: false,
  bufferSize: 30,
  epgRefreshInterval: 24,
  playlistRefreshInterval: 24,
  hardwareAcceleration: true,
  lowLatencyMode: false,
  showChannelNumbers: true,
  rememberLastChannel: true,
  language: 'en'
};

// M3U Parser types (from @iptv/playlist)
export interface M3UPlaylistItem {
  name: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  groupTitle?: string;
  catchup?: string;
  catchupDays?: string;
  catchupSource?: string;
  userAgent?: string;
  referrer?: string;
  extras?: Record<string, string>;
}

export interface M3UPlaylist {
  items: M3UPlaylistItem[];
  header?: {
    attrs?: Record<string, string>;
  };
}
