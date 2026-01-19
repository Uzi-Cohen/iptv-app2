import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Playlist, Channel } from '../../shared/types';
import { StorageService } from './StorageService';

interface XtreamCredentials {
  server: string;
  username: string;
  password: string;
}

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

interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
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
   * Get EPG data for a stream
   */
  async getShortEPG(credentials: XtreamCredentials, streamId: number, limit: number = 4): Promise<unknown> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_short_epg&stream_id=${streamId}&limit=${limit}`;

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get EPG:', error);
      return null;
    }
  }

  /**
   * Build stream URL for a live stream
   */
  buildStreamUrl(credentials: XtreamCredentials, streamId: number, extension: string = 'ts'): string {
    return `${credentials.server}/live/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
  }

  /**
   * Import Xtream playlist and convert to standard format
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
      // Authenticate (0-10%)
      this.reportProgress('Authenticating...', 5);
      const auth = await this.authenticate(credentials);

      if (!auth) {
        this.reportProgress('Authentication failed', 0);
        console.error('[Xtream] ❌ Authentication failed - check credentials');
        return null;
      }

      this.reportProgress('Authenticated', 10);
      console.log(`[Xtream] ✓ Authenticated as ${auth.user_info.username}`);

      // Fetch categories and ALL streams in parallel (10-70%)
      this.reportProgress('Fetching channels...', 15);

      const [categories, allStreams] = await Promise.all([
        this.getLiveCategories(credentials),
        this.getLiveStreams(credentials)
      ]);

      this.reportProgress(`Found ${allStreams.length} channels`, 70);
      console.log(`[Xtream] ✓ Fetched ${allStreams.length} channels`);

      // Create category map
      const categoryMap = new Map<string, string>();
      for (const cat of categories) {
        categoryMap.set(cat.category_id, cat.category_name);
      }

      // Create playlist
      const playlistId = uuidv4();
      const now = new Date().toISOString();

      const playlist: Playlist = {
        id: playlistId,
        name: `Xtream - ${credentials.server.replace(/https?:\/\//, '')}`,
        url,
        channelCount: allStreams.length,
        lastUpdated: now,
        createdAt: now
      };

      // Convert streams to channels (70-90%)
      this.reportProgress(`Processing ${allStreams.length} channels...`, 75);

      const channels: Channel[] = allStreams.map((stream, index) => {
        // Report progress every 1000 channels
        if (index % 1000 === 0) {
          const percent = 75 + Math.round((index / allStreams.length) * 15);
          this.reportProgress(`Processing ${index}/${allStreams.length}...`, percent);
        }
        return {
          id: uuidv4(),
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
      });

      // Save to storage (90-100%)
      this.reportProgress('Saving to database...', 90);
      this.storageService.savePlaylist(playlist);
      this.storageService.saveChannels(channels);

      this.reportProgress(`Done! ${channels.length} channels imported`, 100);
      console.log(`[Xtream] ════════════════════════════════════════`);
      console.log(`[Xtream] ✅ SUCCESS! Imported ${channels.length} channels`);
      console.log(`[Xtream] ════════════════════════════════════════`);
      return playlist;
    } catch (error) {
      console.error('[Xtream] ❌ Failed to import playlist:', error);
      return null;
    }
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percent: number): string {
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * Get XMLTV EPG URL for Xtream
   */
  getEpgUrl(credentials: XtreamCredentials): string {
    return `${credentials.server}/xmltv.php?username=${credentials.username}&password=${credentials.password}`;
  }
}
