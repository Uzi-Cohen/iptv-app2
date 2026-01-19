import axios from 'axios';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Playlist, Channel } from '../../shared/types';
import { StorageService } from './StorageService';

interface ParsedPlaylistItem {
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
}

interface ParsedPlaylist {
  items: ParsedPlaylistItem[];
  header?: {
    tvgUrl?: string;
  };
}

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

  /**
   * Parse M3U/M3U8 playlist content
   */
  private parseM3U(content: string): ParsedPlaylist {
    const lines = content.split(/\r?\n/);
    const items: ParsedPlaylistItem[] = [];
    let header: { tvgUrl?: string } = {};
    let currentItem: Partial<ParsedPlaylistItem> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Parse header
      if (line.startsWith('#EXTM3U')) {
        const tvgUrlMatch = line.match(/x-tvg-url="([^"]+)"/i) ||
                           line.match(/url-tvg="([^"]+)"/i);
        if (tvgUrlMatch) {
          header.tvgUrl = tvgUrlMatch[1];
        }
        continue;
      }

      // Parse EXTINF line
      if (line.startsWith('#EXTINF:')) {
        currentItem = {};

        // Extract attributes
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
        const groupMatch = line.match(/group-title="([^"]*)"/i);
        const catchupMatch = line.match(/catchup="([^"]*)"/i);
        const catchupDaysMatch = line.match(/catchup-days="([^"]*)"/i);
        const catchupSourceMatch = line.match(/catchup-source="([^"]*)"/i);

        if (tvgIdMatch) currentItem.tvgId = tvgIdMatch[1];
        if (tvgNameMatch) currentItem.tvgName = tvgNameMatch[1];
        if (tvgLogoMatch) currentItem.tvgLogo = tvgLogoMatch[1];
        if (groupMatch) currentItem.groupTitle = groupMatch[1];
        if (catchupMatch) currentItem.catchup = catchupMatch[1];
        if (catchupDaysMatch) currentItem.catchupDays = catchupDaysMatch[1];
        if (catchupSourceMatch) currentItem.catchupSource = catchupSourceMatch[1];

        // Extract name (after the last comma)
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) {
          currentItem.name = nameMatch[1].trim();
        }

        continue;
      }

      // Parse EXTVLCOPT for user-agent and referrer
      if (line.startsWith('#EXTVLCOPT:')) {
        const optMatch = line.match(/#EXTVLCOPT:(.+)/);
        if (optMatch) {
          const opt = optMatch[1];
          if (opt.toLowerCase().includes('http-user-agent=')) {
            currentItem.userAgent = opt.split('=')[1];
          } else if (opt.toLowerCase().includes('http-referrer=')) {
            currentItem.referrer = opt.split('=')[1];
          }
        }
        continue;
      }

      // Parse EXTGRP for group
      if (line.startsWith('#EXTGRP:')) {
        currentItem.groupTitle = line.replace('#EXTGRP:', '').trim();
        continue;
      }

      // Skip other comment lines
      if (line.startsWith('#')) continue;

      // This should be the URL
      if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
        if (currentItem.name || Object.keys(currentItem).length > 0) {
          items.push({
            name: currentItem.name || 'Unknown Channel',
            url: line,
            tvgId: currentItem.tvgId,
            tvgName: currentItem.tvgName,
            tvgLogo: currentItem.tvgLogo,
            groupTitle: currentItem.groupTitle,
            catchup: currentItem.catchup,
            catchupDays: currentItem.catchupDays,
            catchupSource: currentItem.catchupSource,
            userAgent: currentItem.userAgent,
            referrer: currentItem.referrer
          });
        }
        currentItem = {};
      }
    }

    return { items, header };
  }

  private async parseAndSavePlaylist(
    content: string,
    url?: string,
    filePath?: string
  ): Promise<Playlist | null> {
    try {
      // Parse the M3U content
      const parsed = this.parseM3U(content);

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
      const channels: Channel[] = parsed.items.map((item, index) =>
        this.convertToChannel(item, playlistId, index)
      );

      // Save to storage
      this.storageService.savePlaylist(playlist);
      this.storageService.saveChannels(channels);

      // If EPG URL found, log it
      if (parsed.header?.tvgUrl) {
        console.log('EPG URL found in playlist:', parsed.header.tvgUrl);
      }

      return playlist;
    } catch (error) {
      console.error('Error parsing playlist:', error);
      return null;
    }
  }

  private convertToChannel(item: ParsedPlaylistItem, playlistId: string, index: number): Channel {
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
      userAgent: item.userAgent || undefined,
      referrer: item.referrer || undefined,
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
      const parsed = this.parseM3U(content);

      if (!parsed.items || parsed.items.length === 0) {
        return null;
      }

      // Convert and save channels
      const channels: Channel[] = parsed.items.map((item, index) =>
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
