import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import {
  Playlist,
  Channel,
  EPGProgram,
  EPGSource,
  HistoryEntry,
  Settings,
  defaultSettings
} from '../../shared/types';

interface StoreSchema {
  playlists: Playlist[];
  channels: Channel[];
  favorites: string[];
  epgSources: EPGSource[];
  epgPrograms: EPGProgram[];
  history: HistoryEntry[];
  settings: Settings;
}

export class StorageService {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'iptv-player-data',
      defaults: {
        playlists: [],
        channels: [],
        favorites: [],
        epgSources: [],
        epgPrograms: [],
        history: [],
        settings: defaultSettings
      }
    });
  }

  // Playlist methods
  savePlaylist(playlist: Playlist): void {
    const playlists = this.store.get('playlists', []);
    const existingIndex = playlists.findIndex(p => p.id === playlist.id);

    if (existingIndex >= 0) {
      playlists[existingIndex] = playlist;
    } else {
      playlists.push(playlist);
    }

    this.store.set('playlists', playlists);
  }

  getAllPlaylists(): Playlist[] {
    return this.store.get('playlists', []);
  }

  getPlaylist(id: string): Playlist | null {
    const playlists = this.store.get('playlists', []);
    return playlists.find(p => p.id === id) || null;
  }

  deletePlaylist(id: string): void {
    const playlists = this.store.get('playlists', []);
    this.store.set('playlists', playlists.filter(p => p.id !== id));
  }

  updatePlaylistChannelCount(id: string, count: number): void {
    const playlists = this.store.get('playlists', []);
    const playlist = playlists.find(p => p.id === id);
    if (playlist) {
      playlist.channelCount = count;
      playlist.lastUpdated = new Date().toISOString();
      this.store.set('playlists', playlists);
    }
  }

  // Channel methods
  saveChannels(channels: Channel[]): void {
    const existingChannels = this.store.get('channels', []);
    const channelMap = new Map(existingChannels.map(c => [c.id, c]));

    for (const channel of channels) {
      channelMap.set(channel.id, channel);
    }

    this.store.set('channels', Array.from(channelMap.values()));
  }

  getChannels(playlistId?: string, group?: string): Channel[] {
    let channels = this.store.get('channels', []);
    const favorites = this.store.get('favorites', []);

    // Mark favorites
    channels = channels.map(c => ({
      ...c,
      isFavorite: favorites.includes(c.id)
    }));

    if (playlistId) {
      channels = channels.filter(c => c.playlistId === playlistId);
    }
    if (group) {
      channels = channels.filter(c => c.group === group);
    }

    return channels.sort((a, b) => a.name.localeCompare(b.name));
  }

  searchChannels(query: string): Channel[] {
    const channels = this.store.get('channels', []);
    const favorites = this.store.get('favorites', []);
    const lowerQuery = query.toLowerCase();

    return channels
      .filter(c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.tvgName?.toLowerCase().includes(lowerQuery) ||
        c.group?.toLowerCase().includes(lowerQuery)
      )
      .map(c => ({
        ...c,
        isFavorite: favorites.includes(c.id)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getChannel(id: string): Channel | null {
    const channels = this.store.get('channels', []);
    const favorites = this.store.get('favorites', []);
    const channel = channels.find(c => c.id === id);

    if (channel) {
      return { ...channel, isFavorite: favorites.includes(channel.id) };
    }
    return null;
  }

  getGroups(playlistId?: string): string[] {
    let channels = this.store.get('channels', []);

    if (playlistId) {
      channels = channels.filter(c => c.playlistId === playlistId);
    }

    const groups = new Set<string>();
    channels.forEach(c => {
      if (c.group) {
        groups.add(c.group);
      }
    });

    return Array.from(groups).sort();
  }

  deleteChannelsByPlaylist(playlistId: string): void {
    const channels = this.store.get('channels', []);
    this.store.set('channels', channels.filter(c => c.playlistId !== playlistId));
  }

  // Favorites methods
  toggleFavorite(channelId: string): boolean {
    const favorites = this.store.get('favorites', []);
    const index = favorites.indexOf(channelId);

    if (index >= 0) {
      favorites.splice(index, 1);
      this.store.set('favorites', favorites);
      return false;
    } else {
      favorites.push(channelId);
      this.store.set('favorites', favorites);
      return true;
    }
  }

  getFavoriteIds(): string[] {
    return this.store.get('favorites', []);
  }

  getFavorites(): Channel[] {
    const channels = this.store.get('channels', []);
    const favorites = this.store.get('favorites', []);

    return channels
      .filter(c => favorites.includes(c.id))
      .map(c => ({ ...c, isFavorite: true }));
  }

  // EPG methods
  saveEPGSource(source: EPGSource): void {
    const sources = this.store.get('epgSources', []);
    const existingIndex = sources.findIndex(s => s.url === source.url);

    if (existingIndex >= 0) {
      sources[existingIndex] = source;
    } else {
      sources.push(source);
    }

    this.store.set('epgSources', sources);
  }

  saveEPGPrograms(programs: EPGProgram[]): void {
    const existingPrograms = this.store.get('epgPrograms', []);
    const programMap = new Map(existingPrograms.map(p => [p.id, p]));

    for (const program of programs) {
      // Convert dates to ISO strings for storage
      const storedProgram = {
        ...program,
        start: program.start instanceof Date ? program.start.toISOString() : program.start,
        end: program.end instanceof Date ? program.end.toISOString() : program.end
      };
      programMap.set(program.id, storedProgram as unknown as EPGProgram);
    }

    // Keep only recent programs (limit to 10000 for performance)
    const allPrograms = Array.from(programMap.values())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(-10000);

    this.store.set('epgPrograms', allPrograms);
  }

  getEPGPrograms(channelId: string, from?: Date, to?: Date): EPGProgram[] {
    const programs = this.store.get('epgPrograms', []);
    const channelIdLower = channelId.toLowerCase();

    return programs.filter(p => {
      if (p.channelId.toLowerCase() !== channelIdLower) return false;

      const programStart = new Date(p.start);
      const programEnd = new Date(p.end);

      if (from && programEnd < from) return false;
      if (to && programStart > to) return false;

      return true;
    }).map(p => ({
      ...p,
      start: new Date(p.start),
      end: new Date(p.end)
    }));
  }

  getCurrentProgram(channelId: string): EPGProgram | null {
    const programs = this.store.get('epgPrograms', []);
    const now = new Date();
    const channelIdLower = channelId.toLowerCase();

    const program = programs.find(p => {
      if (p.channelId.toLowerCase() !== channelIdLower) return false;

      const start = new Date(p.start);
      const end = new Date(p.end);

      return start <= now && end >= now;
    });

    if (program) {
      return {
        ...program,
        start: new Date(program.start),
        end: new Date(program.end)
      };
    }

    return null;
  }

  clearOldEPGPrograms(olderThan: Date): void {
    const programs = this.store.get('epgPrograms', []);
    this.store.set('epgPrograms', programs.filter(p => new Date(p.end) >= olderThan));
  }

  // History methods
  addToHistory(channelId: string): void {
    const channel = this.getChannel(channelId);
    if (!channel) return;
    this.addToHistoryWithChannel(channelId, channel);
  }

  addToHistoryWithChannel(channelId: string, channel: Channel): void {
    const history = this.store.get('history', []);

    // Remove existing entry for this channel
    const filtered = history.filter(h => h.channelId !== channelId);

    // Add new entry at the beginning
    filtered.unshift({
      id: uuidv4(),
      channelId,
      channel,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 entries
    this.store.set('history', filtered.slice(0, 50));
  }

  getHistory(limit: number = 50): HistoryEntry[] {
    const history = this.store.get('history', []);
    const channels = this.store.get('channels', []);
    const favorites = this.store.get('favorites', []);
    const channelMap = new Map(channels.map(c => [c.id, c]));

    return history
      .slice(0, limit)
      .map(h => {
        const channel = channelMap.get(h.channelId);
        if (channel) {
          return {
            ...h,
            channel: { ...channel, isFavorite: favorites.includes(channel.id) }
          };
        }
        return h;
      })
      .filter(h => h.channel);
  }

  clearHistory(): void {
    this.store.set('history', []);
  }

  // Settings methods
  getSettings(): Settings {
    return this.store.get('settings', defaultSettings);
  }

  setSettings(newSettings: Partial<Settings>): void {
    const current = this.store.get('settings', defaultSettings);
    this.store.set('settings', { ...current, ...newSettings });
  }

  // Cleanup
  close(): void {
    // No cleanup needed for electron-store
  }
}
