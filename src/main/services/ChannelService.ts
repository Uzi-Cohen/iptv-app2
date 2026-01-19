import { Channel, ChannelFilters, HistoryEntry, EPGProgram } from '../../shared/types';
import { StorageService } from './StorageService';
import { PlaylistService } from './PlaylistService';
import { EPGService } from './EPGService';

export class ChannelService {
  constructor(
    private storageService: StorageService,
    private playlistService: PlaylistService,
    private epgService: EPGService
  ) {}

  getChannels(filters?: ChannelFilters): Channel[] {
    if (filters?.search) {
      return this.searchChannels(filters.search, filters.playlistId, filters.group);
    }

    if (filters?.favoritesOnly) {
      return this.getFavorites();
    }

    return this.storageService.getChannels(filters?.playlistId, filters?.group);
  }

  private searchChannels(query: string, playlistId?: string, group?: string): Channel[] {
    let channels = this.storageService.searchChannels(query);

    if (playlistId) {
      channels = channels.filter(c => c.playlistId === playlistId);
    }

    if (group) {
      channels = channels.filter(c => c.group === group);
    }

    return channels;
  }

  getChannel(id: string): Channel | null {
    return this.storageService.getChannel(id);
  }

  getGroups(playlistId?: string): string[] {
    return this.storageService.getGroups(playlistId);
  }

  toggleFavorite(channelId: string): boolean {
    return this.storageService.toggleFavorite(channelId);
  }

  getFavorites(): Channel[] {
    return this.storageService.getFavorites();
  }

  // History management
  addToHistory(channelId: string): void {
    this.storageService.addToHistory(channelId);
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
    return this.storageService.getChannels().length;
  }

  getGroupCount(): number {
    return this.storageService.getGroups().length;
  }

  getFavoriteCount(): number {
    return this.storageService.getFavorites().length;
  }
}
