import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Playlist management
  importPlaylist: (url: string) => ipcRenderer.invoke('playlist:import', url),
  importPlaylistFile: () => ipcRenderer.invoke('playlist:importFile'),
  getAllPlaylists: () => ipcRenderer.invoke('playlist:getAll'),
  deletePlaylist: (id: string) => ipcRenderer.invoke('playlist:delete', id),
  refreshPlaylist: (id: string) => ipcRenderer.invoke('playlist:refresh', id),

  // Channel management
  getChannels: (filters?: { playlistId?: string; group?: string; search?: string }) =>
    ipcRenderer.invoke('channel:getAll', filters),
  getGroups: (playlistId?: string) => ipcRenderer.invoke('channel:getGroups', playlistId),
  toggleFavorite: (channelId: string) => ipcRenderer.invoke('channel:toggleFavorite', channelId),
  getFavorites: () => ipcRenderer.invoke('channel:getFavorites'),

  // EPG management
  importEPG: (url: string) => ipcRenderer.invoke('epg:import', url),
  getEPGForChannel: (channelId: string) => ipcRenderer.invoke('epg:getForChannel', channelId),
  getCurrentProgram: (channelId: string) => ipcRenderer.invoke('epg:getCurrentProgram', channelId),

  // Stream
  testStream: (url: string) => ipcRenderer.invoke('stream:test', url),
  getStreamInfo: (url: string) => ipcRenderer.invoke('stream:getInfo', url),

  // History
  addToHistory: (channelId: string) => ipcRenderer.invoke('history:add', channelId),
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:set', settings),

  // Import progress listener
  onImportProgress: (callback: (data: { status: string; percent: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { status: string; percent: number }) => callback(data);
    ipcRenderer.on('import:progress', listener);
    return () => ipcRenderer.removeListener('import:progress', listener);
  }
});

// Type definitions for the exposed API
export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  importPlaylist: (url: string) => Promise<Playlist | null>;
  importPlaylistFile: () => Promise<Playlist | null>;
  getAllPlaylists: () => Promise<Playlist[]>;
  deletePlaylist: (id: string) => Promise<boolean>;
  refreshPlaylist: (id: string) => Promise<Playlist | null>;
  getChannels: (filters?: ChannelFilters) => Promise<Channel[]>;
  getGroups: (playlistId?: string) => Promise<string[]>;
  toggleFavorite: (channelId: string) => Promise<boolean>;
  getFavorites: () => Promise<Channel[]>;
  importEPG: (url: string) => Promise<boolean>;
  getEPGForChannel: (channelId: string) => Promise<EPGProgram[]>;
  getCurrentProgram: (channelId: string) => Promise<EPGProgram | null>;
  testStream: (url: string) => Promise<StreamTestResult>;
  getStreamInfo: (url: string) => Promise<StreamInfo>;
  addToHistory: (channelId: string) => Promise<void>;
  getHistory: () => Promise<HistoryEntry[]>;
  clearHistory: () => Promise<void>;
  getSettings: () => Promise<Settings>;
  setSettings: (settings: Partial<Settings>) => Promise<void>;
  onImportProgress: (callback: (data: { status: string; percent: number }) => void) => () => void;
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
  playlistId: string;
  isFavorite: boolean;
}

interface ChannelFilters {
  playlistId?: string;
  group?: string;
  search?: string;
}

interface EPGProgram {
  title: string;
  description?: string;
  start: string;
  end: string;
  category?: string;
}

interface StreamTestResult {
  success: boolean;
  latency?: number;
  error?: string;
}

interface StreamInfo {
  type: string;
  resolution?: string;
  bitrate?: number;
}

interface HistoryEntry {
  channel: Channel;
  timestamp: string;
}

interface Settings {
  theme: 'dark' | 'light';
  autoplay: boolean;
  volume: number;
  bufferSize: number;
  epgRefreshInterval: number;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
