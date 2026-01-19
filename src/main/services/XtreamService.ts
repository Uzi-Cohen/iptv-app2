import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  Playlist,
  Channel,
  XtreamCredentials,
  XtreamCategory,
  XtreamStream,
  XtreamVOD,
  XtreamSeries,
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
        headers: { 'User-Agent': 'IPTV-Player/1.0' }
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
  async getLiveStreams(credentials: XtreamCredentials): Promise<XtreamStream[]> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_streams`;
      const response = await axios.get<XtreamStream[]>(apiUrl, {
        timeout: 120000,
        headers: { 'User-Agent': 'IPTV-Player/1.0' }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get live streams:', error);
      return [];
    }
  }

  /**
   * Get VOD categories
   */
  async getVODCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_vod_categories`;
      const response = await axios.get<XtreamCategory[]>(apiUrl, {
        timeout: 30000,
        headers: { 'User-Agent': 'IPTV-Player/1.0' }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get VOD categories:', error);
      return [];
    }
  }

  /**
   * Get VOD streams (movies)
   */
  async getVODStreams(credentials: XtreamCredentials): Promise<XtreamVOD[]> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_vod_streams`;
      const response = await axios.get<XtreamVOD[]>(apiUrl, {
        timeout: 120000,
        headers: { 'User-Agent': 'IPTV-Player/1.0' }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get VOD streams:', error);
      return [];
    }
  }

  /**
   * Get series categories
   */
  async getSeriesCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_series_categories`;
      const response = await axios.get<XtreamCategory[]>(apiUrl, {
        timeout: 30000,
        headers: { 'User-Agent': 'IPTV-Player/1.0' }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get series categories:', error);
      return [];
    }
  }

  /**
   * Get series (TV shows)
   */
  async getSeries(credentials: XtreamCredentials): Promise<XtreamSeries[]> {
    try {
      const apiUrl = `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_series`;
      const response = await axios.get<XtreamSeries[]>(apiUrl, {
        timeout: 120000,
        headers: { 'User-Agent': 'IPTV-Player/1.0' }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get series:', error);
      return [];
    }
  }

  /**
   * Build stream URL for live stream (use .m3u8 for HLS compatibility)
   */
  buildLiveStreamUrl(credentials: XtreamCredentials, streamId: number): string {
    return `${credentials.server}/live/${credentials.username}/${credentials.password}/${streamId}.m3u8`;
  }

  /**
   * Build stream URL for VOD
   */
  buildVODUrl(credentials: XtreamCredentials, streamId: number, extension: string): string {
    return `${credentials.server}/movie/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
  }

  /**
   * Build URL for series info (to get episodes)
   */
  buildSeriesInfoUrl(credentials: XtreamCredentials, seriesId: number): string {
    return `${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_series_info&series_id=${seriesId}`;
  }

  /**
   * Convert live stream to Channel
   */
  liveStreamToChannel(
    stream: XtreamStream,
    playlistId: string,
    credentials: XtreamCredentials,
    categoryMap: Map<string, string>
  ): Channel {
    return {
      id: `${playlistId}_live_${stream.stream_id}`,
      name: stream.name,
      url: this.buildLiveStreamUrl(credentials, stream.stream_id),
      logo: stream.stream_icon || undefined,
      group: `Live TV - ${categoryMap.get(stream.category_id) || 'Uncategorized'}`,
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
   * Convert VOD to Channel
   */
  vodToChannel(
    vod: XtreamVOD,
    playlistId: string,
    credentials: XtreamCredentials,
    categoryMap: Map<string, string>
  ): Channel {
    return {
      id: `${playlistId}_vod_${vod.stream_id}`,
      name: vod.name,
      url: this.buildVODUrl(credentials, vod.stream_id, vod.container_extension || 'mp4'),
      logo: vod.stream_icon || undefined,
      group: `Movies - ${categoryMap.get(vod.category_id) || 'Uncategorized'}`,
      tvgName: vod.name,
      tvgLogo: vod.stream_icon || undefined,
      playlistId,
      isFavorite: false
    };
  }

  /**
   * Convert Series to Channel (as a placeholder - series need special handling)
   */
  seriesToChannel(
    series: XtreamSeries,
    playlistId: string,
    credentials: XtreamCredentials,
    categoryMap: Map<string, string>
  ): Channel {
    return {
      id: `${playlistId}_series_${series.series_id}`,
      name: series.name,
      // Series URL points to the series info endpoint - player needs to handle this specially
      url: this.buildSeriesInfoUrl(credentials, series.series_id),
      logo: series.cover || undefined,
      group: `TV Shows - ${categoryMap.get(series.category_id) || 'Uncategorized'}`,
      tvgName: series.name,
      tvgLogo: series.cover || undefined,
      playlistId,
      isFavorite: false
    };
  }

  /**
   * Get all channels from an Xtream playlist (lazy transformation)
   */
  getChannelsFromPlaylist(playlist: Playlist): Channel[] {
    if (!playlist.xtream) {
      return [];
    }

    const { credentials, liveCategories, liveStreams, vodCategories, vodStreams, seriesCategories, series } = playlist.xtream;
    const channels: Channel[] = [];

    // Build category maps
    const liveCategoryMap = new Map<string, string>();
    for (const cat of liveCategories || []) {
      liveCategoryMap.set(cat.category_id, cat.category_name);
    }

    const vodCategoryMap = new Map<string, string>();
    for (const cat of vodCategories || []) {
      vodCategoryMap.set(cat.category_id, cat.category_name);
    }

    const seriesCategoryMap = new Map<string, string>();
    for (const cat of seriesCategories || []) {
      seriesCategoryMap.set(cat.category_id, cat.category_name);
    }

    // Add live streams
    for (const stream of liveStreams || []) {
      channels.push(this.liveStreamToChannel(stream, playlist.id, credentials, liveCategoryMap));
    }

    // Add VOD
    for (const vod of vodStreams || []) {
      channels.push(this.vodToChannel(vod, playlist.id, credentials, vodCategoryMap));
    }

    // Add series
    for (const s of series || []) {
      channels.push(this.seriesToChannel(s, playlist.id, credentials, seriesCategoryMap));
    }

    return channels;
  }

  /**
   * Get groups from an Xtream playlist
   */
  getGroupsFromPlaylist(playlist: Playlist): string[] {
    if (!playlist.xtream) {
      return [];
    }

    const groups: string[] = [];

    // Add live categories
    for (const cat of playlist.xtream.liveCategories || []) {
      groups.push(`Live TV - ${cat.category_name}`);
    }

    // Add VOD categories
    for (const cat of playlist.xtream.vodCategories || []) {
      groups.push(`Movies - ${cat.category_name}`);
    }

    // Add series categories
    for (const cat of playlist.xtream.seriesCategories || []) {
      groups.push(`TV Shows - ${cat.category_name}`);
    }

    return groups.sort();
  }

  /**
   * Import Xtream playlist - FAST lazy loading version
   * Fetches all content types: Live TV, Movies, and Series
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

      // Fetch ALL content in parallel (10-80%)
      this.reportProgress('Fetching Live TV...', 15);

      const [
        liveCategories,
        liveStreams,
        vodCategories,
        vodStreams,
        seriesCategories,
        series
      ] = await Promise.all([
        this.getLiveCategories(credentials),
        this.getLiveStreams(credentials),
        this.getVODCategories(credentials),
        this.getVODStreams(credentials),
        this.getSeriesCategories(credentials),
        this.getSeries(credentials)
      ]);

      const totalCount = liveStreams.length + vodStreams.length + series.length;

      this.reportProgress(`Found ${totalCount} items`, 80);
      console.log(`[Xtream] ✓ Live: ${liveStreams.length}, Movies: ${vodStreams.length}, Series: ${series.length}`);

      // Create playlist with embedded Xtream data (80-100%)
      this.reportProgress('Saving playlist...', 90);

      const playlistId = uuidv4();
      const now = new Date().toISOString();

      const xtreamData: XtreamPlaylistData = {
        credentials,
        liveCategories,
        liveStreams,
        vodCategories,
        vodStreams,
        seriesCategories,
        series
      };

      const playlist: Playlist = {
        id: playlistId,
        name: `Xtream - ${credentials.server.replace(/https?:\/\//, '')}`,
        url,
        channelCount: totalCount,
        lastUpdated: now,
        createdAt: now,
        xtream: xtreamData
      };

      // Save playlist (with embedded Xtream data)
      this.storageService.savePlaylist(playlist);

      this.reportProgress(`Done! ${totalCount} items imported`, 100);
      console.log(`[Xtream] ════════════════════════════════════════`);
      console.log(`[Xtream] ✅ SUCCESS! Imported ${totalCount} items (lazy loaded)`);
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
