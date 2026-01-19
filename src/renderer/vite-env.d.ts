/// <reference types="vite/client" />

interface Window {
  api: {
    // Window controls
    minimize: () => void;
    maximize: () => void;
    close: () => void;

    // Playlist management
    importPlaylist: (url: string) => Promise<Playlist | null>;
    importPlaylistFile: () => Promise<Playlist | null>;
    getAllPlaylists: () => Promise<Playlist[]>;
    deletePlaylist: (id: string) => Promise<boolean>;
    refreshPlaylist: (id: string) => Promise<Playlist | null>;

    // Channel management
    getChannels: (filters?: ChannelFilters) => Promise<Channel[]>;
    getGroups: (playlistId?: string) => Promise<string[]>;
    toggleFavorite: (channelId: string) => Promise<boolean>;
    getFavorites: () => Promise<Channel[]>;

    // EPG management
    importEPG: (url: string) => Promise<boolean>;
    getEPGForChannel: (channelId: string) => Promise<EPGProgram[]>;
    getCurrentProgram: (channelId: string) => Promise<EPGProgram | null>;

    // Stream
    testStream: (url: string) => Promise<StreamTestResult>;
    getStreamInfo: (url: string) => Promise<StreamInfo>;

    // History
    addToHistory: (channelId: string) => Promise<void>;
    getHistory: () => Promise<HistoryEntry[]>;
    clearHistory: () => Promise<void>;

    // Settings
    getSettings: () => Promise<Settings>;
    setSettings: (settings: Partial<Settings>) => Promise<void>;
  };
}

interface Playlist {
  id: string;
  name: string;
  url: string;
  channelCount: number;
  lastUpdated: string;
}

interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  playlistId: string;
  isFavorite: boolean;
  userAgent?: string;
  referrer?: string;
  catchup?: {
    type: 'default' | 'flussonic' | 'xc' | 'shift';
    days?: number;
    source?: string;
  };
}

interface ChannelFilters {
  playlistId?: string;
  group?: string;
  search?: string;
}

interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category?: string;
}

interface StreamTestResult {
  success: boolean;
  latency?: number;
  error?: string;
}

interface StreamInfo {
  type: string;
  url: string;
  resolution?: string;
  bitrate?: number;
}

interface HistoryEntry {
  id: string;
  channelId: string;
  channel: Channel;
  timestamp: string;
}

interface Settings {
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
  language: string;
}
