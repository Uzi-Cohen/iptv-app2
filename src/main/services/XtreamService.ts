import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  Playlist,
  Channel,
  XtreamCredentials,
  XtreamCategory,
  XtreamStream,
  XtreamPlaylistData
} from '../../shared/types';
import { StorageService } from './StorageService';

interface XtreamAuthResponse {
  user_info: {
    username: string;
    password: string;
    status: string;
    exp_date: string;
    max_connections: string;
    active_cons: string;
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    timezone: string;
  };
}

export type ProgressCallback = (status: string, percent: number) => void;

export class XtreamService {
  private onProgress: ProgressCallback | null = null;

  constructor(private storageService: StorageService) {}

  setProgressCallback(callback: ProgressCallback | null): void {
    this.onProgress = callback;
  }

  private reportProgress(status: string, percent: number): void {
    console.log(`[Xtream] ${percent}% - ${status}`);
    if (this.onProgress) {
      this.onProgress(status, percent);
    }
  }

  /**
   * Parse Xtream credentials from various URL formats
   */
  parseXtreamUrl(url: string): XtreamCredentials | null {
    // Format 1: http://server/get.php?username=X&password=X&type=m3u_plus
    const getPhpMatch = url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/i);
    if (getPhpMatch) {
      return {
        server: getPhpMatch[1],
        username: getPhpMatch[2],
        password: getPhpMatch[3]
      };
    }

    // Format 2: http://server/player_api.php?username=X&password=X
    const playerApiMatch = url.match(/^(https?:\/\/[^/]+)\/player_api\.php\?username=([^&]+)&password=([^&]+)/i);
    if (playerApiMatch) {
      return {
        server: playerApiMatch[1],
        username: playerApiMatch[2],
        password: playerApiMatch[3]
      };
    }

    // Format 3: http://server:port/username/password/...
    const directMatch = url.match(/^(https?:\/\/[^/]+)\/([^/]+)\/([^/]+)\/(live|movie|series)/i);
    if (directMatch) {
      return {
        server: directMatch[1],
        username: directMatch[2],
        password: directMatch[3]
      };
    }

    return null;
  }

  /**
   * Check if URL is an Xtream Codes URL
   */
  isXtreamUrl(url: string): boolean {
    return this.parseXtreamUrl(url) !== null ||
           url.includes('get.php?username=') ||
           url.includes('player_api.php?username=');
  }

  /**
   * Authenticate with Xtream server
   */
  async authenticate(credentials: XtreamCredentials): Promise<XtreamAuthResponse | null> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}`;

      const response = await axios.get<XtreamAuthResponse>(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0'
        }
      });

      if (response.data?.user_info?.status === 'Active') {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Xtream authentication failed:', error);
      return null;
    }
  }

  /**
   * Get live stream categories
   */
  async getLiveCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_categories`;

      const response = await axios.get<XtreamCategory[]>(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0'
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to get live categories:', error);
      return [];
    }
  }

  /**
   * Get live streams
   */
  async getLiveStreams(credentials: XtreamCredentials, categoryId?: string): Promise<XtreamStream[]> {
    try {
      let apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_streams`;

      if (categoryId) {
        apiUrl += `&category_id=${categoryId}`;
      }

      const response = await axios.get<XtreamStream[]>(apiUrl, {
        timeout: 120000, // 2 minutes - some providers have thousands of channels
        headers: {
          'User-Agent': 'IPTV-Player/1.0'
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to get live streams:', error);
      return [];
    }
  }

  /**
   * Build stream URL for a live stream (called on-demand when playing)
   */
  buildStreamUrl(credentials: XtreamCredentials, streamId: number, extension: string = 'ts'): string {
    return `${credentials.server}/live/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
  }

  /**
   * Build stream URL from playlist and stream_id (public helper for on-demand URL building)
   */
  buildStreamUrlFromPlaylist(playlist: Playlist, streamId: number): string | null {
    if (!playlist.xtream?.credentials) {
      return null;
    }
    return this.buildStreamUrl(playlist.xtream.credentials, streamId);
  }

  /**
   * Convert raw Xtream stream to Channel format (called on-demand)
   */
  streamToChannel(
    stream: XtreamStream,
    playlistId: string,
    credentials: XtreamCredentials,
    categoryMap: Map<string, string>
  ): Channel {
    return {
      id: `${playlistId}_${stream.stream_id}`, // Deterministic ID based on playlist + stream
      name: stream.name,
      url: this.buildStreamUrl(credentials, stream.stream_id),
      logo: stream.stream_icon || undefined,
      group: categoryMap.get(stream.category_id) || 'Uncategorized',
      tvgId: stream.epg_channel_id || undefined,
      tvgName: stream.name,
      tvgLogo: stream.stream_icon || undefined,
      playlistId,
      isFavorite: false,
      catchup: stream.tv_archive ? {
        type: 'default' as const,
        days: stream.tv_archive_duration || 7,
        source: undefined
      } : undefined
    };
  }

  /**
   * Get channels from an Xtream playlist (lazy transformation)
   */
  getChannelsFromPlaylist(playlist: Playlist): Channel[] {
    if (!playlist.xtream) {
      return [];
    }

    const { credentials, categories, streams } = playlist.xtream;

    // Build category map
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.category_id, cat.category_name);
    }

    // Transform streams to channels on-demand
    return streams.map(stream =>
      this.streamToChannel(stream, playlist.id, credentials, categoryMap)
    );
  }

  /**
   * Get groups from an Xtream playlist
   */
  getGroupsFromPlaylist(playlist: Playlist): string[] {
    if (!playlist.xtream?.categories) {
      return [];
    }
    return playlist.xtream.categories.map(cat => cat.category_name).sort();
  }

  /**
   * Import Xtream playlist - FAST lazy loading version
   * Stores raw API data without processing channels
   */
  async importXtreamPlaylist(url: string): Promise<Playlist | null> {
    const credentials = this.parseXtreamUrl(url);
    if (!credentials) {
      console.error('[Xtream] Failed to parse credentials from URL');
      return null;
    }

    console.log(`[Xtream] ════════════════════════════════════════`);
    console.log(`[Xtream] Connecting to ${credentials.server}`);
    console.log(`[Xtream] Username: ${credentials.username}`);
    console.log(`[Xtream] ════════════════════════════════════════`);

    try {
      // Authenticate (0-20%)
      this.reportProgress('Authenticating...', 10);
      const auth = await this.authenticate(credentials);

      if (!auth) {
        this.reportProgress('Authentication failed', 0);
        console.error('[Xtream] ❌ Authentication failed - check credentials');
        return null;
      }

      this.reportProgress('Authenticated', 20);
      console.log(`[Xtream] ✓ Authenticated as ${auth.user_info.username}`);

      // Fetch categories and ALL streams in parallel (20-80%)
      this.reportProgress('Fetching channels...', 30);

      const [categories, streams] = await Promise.all([
        this.getLiveCategories(credentials),
        this.getLiveStreams(credentials)
      ]);

      this.reportProgress(`Found ${streams.length} channels`, 80);
      console.log(`[Xtream] ✓ Fetched ${streams.length} channels in ${categories.length} categories`);

      // Create playlist with embedded Xtream data (80-100%)
      this.reportProgress('Saving playlist...', 90);

      const playlistId = uuidv4();
      const now = new Date().toISOString();

      const xtreamData: XtreamPlaylistData = {
        credentials,
        categories,
        streams
      };

      const playlist: Playlist = {
        id: playlistId,
        name: `Xtream - ${credentials.server.replace(/https?:\/\//, '')}`,
        url,
        channelCount: streams.length,
        lastUpdated: now,
        createdAt: now,
        xtream: xtreamData
      };

      // Save playlist (with embedded Xtream data)
      this.storageService.savePlaylist(playlist);

      this.reportProgress(`Done! ${streams.length} channels imported`, 100);
      console.log(`[Xtream] ════════════════════════════════════════`);
      console.log(`[Xtream] ✅ SUCCESS! Imported ${streams.length} channels (lazy loaded)`);
      console.log(`[Xtream] ════════════════════════════════════════`);

      return playlist;
    } catch (error) {
      console.error('[Xtream] ❌ Failed to import playlist:', error);
      return null;
    }
  }

  /**
   * Get XMLTV EPG URL for Xtream
   */
  getEpgUrl(credentials: XtreamCredentials): string {
    return `${credentials.server}/xmltv.php?username=${credentials.username}&password=${credentials.password}`;
  }
}
