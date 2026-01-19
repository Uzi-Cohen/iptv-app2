import { Channel, ChannelFilters, HistoryEntry, EPGProgram } from '../../shared/types';
import { StorageService } from './StorageService';
import { PlaylistService } from './PlaylistService';
import { EPGService } from './EPGService';
import { XtreamService } from './XtreamService';

export class ChannelService {
  private xtreamService: XtreamService;

  constructor(
    private storageService: StorageService,
    private playlistService: PlaylistService,
    private epgService: EPGService
  ) {
    this.xtreamService = new XtreamService(storageService);
  }

  /**
   * Get all channels (combines regular M3U channels with Xtream lazy-loaded channels)
   */
  getChannels(filters?: ChannelFilters): Channel[] {
    if (filters?.search) {
      return this.searchChannels(filters.search, filters.playlistId, filters.group);
    }

    if (filters?.favoritesOnly) {
      return this.getFavorites();
    }

    // Get channels from specific playlist or all playlists
    let channels: Channel[] = [];
    const favorites = this.storageService.getFavoriteIds();

    if (filters?.playlistId) {
      // Check if it's an Xtream playlist
      const playlist = this.storageService.getPlaylist(filters.playlistId);
      if (playlist?.xtream) {
        // Lazy load channels from Xtream data
        channels = this.xtreamService.getChannelsFromPlaylist(playlist);
      } else {
        // Regular M3U channels from storage
        channels = this.storageService.getChannels(filters.playlistId, filters.group);
      }
    } else {
      // Get all channels from all sources
      // First, regular M3U channels
      channels = this.storageService.getChannels(undefined, filters?.group);

      // Then, add lazy-loaded Xtream channels
      const playlists = this.storageService.getAllPlaylists();
      for (const playlist of playlists) {
        if (playlist.xtream) {
          const xtreamChannels = this.xtreamService.getChannelsFromPlaylist(playlist);
          channels = channels.concat(xtreamChannels);
        }
      }
    }

    // Apply group filter if specified (for Xtream channels)
    if (filters?.group && filters.playlistId) {
      const playlist = this.storageService.getPlaylist(filters.playlistId);
      if (playlist?.xtream) {
        channels = channels.filter(c => c.group === filters.group);
      }
    }

    // Mark favorites
    channels = channels.map(c => ({
      ...c,
      isFavorite: favorites.includes(c.id)
    }));

    return channels.sort((a, b) => a.name.localeCompare(b.name));
  }

  private searchChannels(query: string, playlistId?: string, group?: string): Channel[] {
    const lowerQuery = query.toLowerCase();
    let channels = this.getChannels({ playlistId, group });

    return channels.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.tvgName?.toLowerCase().includes(lowerQuery) ||
      c.group?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get a single channel by ID (checks both storage and Xtream playlists)
   */
  getChannel(id: string): Channel | null {
    // First check regular storage
    const storedChannel = this.storageService.getChannel(id);
    if (storedChannel) {
      return storedChannel;
    }

    // Check Xtream playlists (ID format: playlistId_streamId)
    const playlists = this.storageService.getAllPlaylists();
    for (const playlist of playlists) {
      if (playlist.xtream && id.startsWith(playlist.id + '_')) {
        const channels = this.xtreamService.getChannelsFromPlaylist(playlist);
        const channel = channels.find(c => c.id === id);
        if (channel) {
          const favorites = this.storageService.getFavoriteIds();
          return { ...channel, isFavorite: favorites.includes(id) };
        }
      }
    }

    return null;
  }

  /**
   * Get all groups (combines regular and Xtream groups)
   */
  getGroups(playlistId?: string): string[] {
    const groups = new Set<string>();

    if (playlistId) {
      const playlist = this.storageService.getPlaylist(playlistId);
      if (playlist?.xtream) {
        // Get groups from Xtream data
        const xtreamGroups = this.xtreamService.getGroupsFromPlaylist(playlist);
        xtreamGroups.forEach(g => groups.add(g));
      } else {
        // Get groups from regular storage
        this.storageService.getGroups(playlistId).forEach(g => groups.add(g));
      }
    } else {
      // Get all groups from all sources
      this.storageService.getGroups().forEach(g => groups.add(g));

      const playlists = this.storageService.getAllPlaylists();
      for (const playlist of playlists) {
        if (playlist.xtream) {
          const xtreamGroups = this.xtreamService.getGroupsFromPlaylist(playlist);
          xtreamGroups.forEach(g => groups.add(g));
        }
      }
    }

    return Array.from(groups).sort();
  }

  toggleFavorite(channelId: string): boolean {
    return this.storageService.toggleFavorite(channelId);
  }

  getFavorites(): Channel[] {
    const favorites = this.storageService.getFavoriteIds();
    const channels: Channel[] = [];

    // Get favorites from regular storage
    const storedFavorites = this.storageService.getFavorites();
    channels.push(...storedFavorites);

    // Get favorites from Xtream playlists
    const playlists = this.storageService.getAllPlaylists();
    for (const playlist of playlists) {
      if (playlist.xtream) {
        const xtreamChannels = this.xtreamService.getChannelsFromPlaylist(playlist);
        const favChannels = xtreamChannels.filter(c => favorites.includes(c.id));
        channels.push(...favChannels.map(c => ({ ...c, isFavorite: true })));
      }
    }

    return channels;
  }

  // History management
  addToHistory(channelId: string): void {
    // For Xtream channels, we need to get the channel first
    const channel = this.getChannel(channelId);
    if (channel) {
      this.storageService.addToHistoryWithChannel(channelId, channel);
    }
  }

  getHistory(): HistoryEntry[] {
    return this.storageService.getHistory();
  }

  clearHistory(): void {
    this.storageService.clearHistory();
  }

  // EPG integration
  getEPGForChannel(channelId: string): EPGProgram[] {
    const channel = this.getChannel(channelId);
    if (!channel) {
      return [];
    }

    // Try tvg-id first, then channel name
    const tvgId = channel.tvgId || channel.tvgName || channel.name;
    return this.epgService.getProgramsForChannel(tvgId);
  }

  getCurrentProgram(channelId: string): EPGProgram | null {
    const channel = this.getChannel(channelId);
    if (!channel) {
      return null;
    }

    const tvgId = channel.tvgId || channel.tvgName || channel.name;
    return this.epgService.getCurrentProgram(tvgId);
  }

  // Channel statistics
  getChannelCount(): number {
    let count = this.storageService.getChannels().length;

    // Add Xtream channel counts
    const playlists = this.storageService.getAllPlaylists();
    for (const playlist of playlists) {
      if (playlist.xtream) {
        count += playlist.xtream.streams.length;
      }
    }

    return count;
  }

  getGroupCount(): number {
    return this.getGroups().length;
  }

  getFavoriteCount(): number {
    return this.getFavorites().length;
  }
}
