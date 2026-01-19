import axios from 'axios';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { parse } from '@iptv/playlist';
import { Playlist, Channel, M3UPlaylistItem } from '../../shared/types';
import { StorageService } from './StorageService';

export class PlaylistService {
  constructor(private storageService: StorageService) {}

  async importPlaylist(url: string): Promise<Playlist | null> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0'
        },
        responseType: 'text'
      });

      const content = response.data;
      return this.parseAndSavePlaylist(content, url);
    } catch (error) {
      console.error('Error importing playlist from URL:', error);
      return null;
    }
  }

  async importPlaylistFromFile(filePath: string): Promise<Playlist | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseAndSavePlaylist(content, undefined, filePath);
    } catch (error) {
      console.error('Error importing playlist from file:', error);
      return null;
    }
  }

  private async parseAndSavePlaylist(
    content: string,
    url?: string,
    filePath?: string
  ): Promise<Playlist | null> {
    try {
      // Parse the M3U content using @iptv/playlist
      const parsed = parse(content);

      if (!parsed.items || parsed.items.length === 0) {
        console.error('No channels found in playlist');
        return null;
      }

      const playlistId = uuidv4();
      const now = new Date().toISOString();

      // Extract playlist name from various sources
      let playlistName = 'Imported Playlist';
      if (url) {
        const urlMatch = url.match(/\/([^/?]+)(?:\.[^.]+)?(?:\?|$)/);
        if (urlMatch) {
          playlistName = decodeURIComponent(urlMatch[1]);
        }
      } else if (filePath) {
        const fileMatch = filePath.match(/([^/\\]+)\.[^.]+$/);
        if (fileMatch) {
          playlistName = fileMatch[1];
        }
      }

      // Check for x-tvg-url in header for EPG
      const epgUrl = parsed.header?.attrs?.['x-tvg-url'] || parsed.header?.attrs?.['url-tvg'];

      // Create playlist
      const playlist: Playlist = {
        id: playlistId,
        name: playlistName,
        url: url || '',
        filePath,
        channelCount: parsed.items.length,
        lastUpdated: now,
        createdAt: now
      };

      // Convert parsed items to channels
      const channels: Channel[] = parsed.items.map((item: M3UPlaylistItem, index: number) =>
        this.convertToChannel(item, playlistId, index)
      );

      // Save to storage
      this.storageService.savePlaylist(playlist);
      this.storageService.saveChannels(channels);

      // If EPG URL found, import it automatically
      if (epgUrl) {
        console.log('EPG URL found in playlist:', epgUrl);
        // EPG import would be handled by EPGService
      }

      return playlist;
    } catch (error) {
      console.error('Error parsing playlist:', error);
      return null;
    }
  }

  private convertToChannel(item: M3UPlaylistItem, playlistId: string, index: number): Channel {
    return {
      id: uuidv4(),
      name: item.name || `Channel ${index + 1}`,
      url: item.url,
      logo: item.tvgLogo || undefined,
      group: item.groupTitle || undefined,
      tvgId: item.tvgId || undefined,
      tvgName: item.tvgName || undefined,
      tvgLogo: item.tvgLogo || undefined,
      playlistId,
      isFavorite: false,
      userAgent: item.userAgent || item.extras?.['http-user-agent'] || undefined,
      referrer: item.referrer || item.extras?.['http-referrer'] || undefined,
      catchup: item.catchup ? {
        type: this.parseCatchupType(item.catchup),
        days: item.catchupDays ? parseInt(item.catchupDays, 10) : undefined,
        source: item.catchupSource || undefined
      } : undefined
    };
  }

  private parseCatchupType(type: string): 'default' | 'flussonic' | 'xc' | 'shift' {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('flussonic') || lowerType.includes('fs')) {
      return 'flussonic';
    }
    if (lowerType.includes('xc') || lowerType.includes('xtream')) {
      return 'xc';
    }
    if (lowerType.includes('shift') || lowerType.includes('timeshift')) {
      return 'shift';
    }
    return 'default';
  }

  async refreshPlaylist(id: string): Promise<Playlist | null> {
    const playlist = this.storageService.getPlaylist(id);
    if (!playlist) {
      return null;
    }

    // Delete existing channels
    this.storageService.deleteChannelsByPlaylist(id);

    try {
      let content: string;

      if (playlist.url) {
        const response = await axios.get(playlist.url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'IPTV-Player/1.0'
          },
          responseType: 'text'
        });
        content = response.data;
      } else if (playlist.filePath) {
        content = await fs.readFile(playlist.filePath, 'utf-8');
      } else {
        return null;
      }

      // Parse the content
      const parsed = parse(content);

      if (!parsed.items || parsed.items.length === 0) {
        return null;
      }

      // Convert and save channels
      const channels: Channel[] = parsed.items.map((item: M3UPlaylistItem, index: number) =>
        this.convertToChannel(item, id, index)
      );

      this.storageService.saveChannels(channels);
      this.storageService.updatePlaylistChannelCount(id, channels.length);

      return this.storageService.getPlaylist(id);
    } catch (error) {
      console.error('Error refreshing playlist:', error);
      return null;
    }
  }

  getAllPlaylists(): Playlist[] {
    return this.storageService.getAllPlaylists();
  }

  deletePlaylist(id: string): boolean {
    try {
      this.storageService.deleteChannelsByPlaylist(id);
      this.storageService.deletePlaylist(id);
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }
  }

  getPlaylist(id: string): Playlist | null {
    return this.storageService.getPlaylist(id);
  }
}
