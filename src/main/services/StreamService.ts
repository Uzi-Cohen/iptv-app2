import axios from 'axios';
import { StreamTestResult, StreamInfo, StreamType } from '../../shared/types';

export class StreamService {
  async testStream(url: string): Promise<StreamTestResult> {
    const startTime = Date.now();

    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      const latency = Date.now() - startTime;
      const contentType = response.headers['content-type'] || '';
      const type = this.detectStreamType(url, contentType);

      return {
        success: true,
        latency,
        type
      };
    } catch (error) {
      // Try a GET request for streams that don't support HEAD
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'IPTV-Player/1.0',
            'Range': 'bytes=0-1024'
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 400,
          responseType: 'arraybuffer'
        });

        const latency = Date.now() - startTime;
        const contentType = response.headers['content-type'] || '';
        const type = this.detectStreamType(url, contentType);

        return {
          success: true,
          latency,
          type
        };
      } catch (getError) {
        return {
          success: false,
          error: getError instanceof Error ? getError.message : 'Stream test failed'
        };
      }
    }
  }

  async getStreamInfo(url: string): Promise<StreamInfo> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0',
          'Range': 'bytes=0-65536' // Get first 64KB
        },
        maxRedirects: 5,
        responseType: 'text'
      });

      const contentType = response.headers['content-type'] || '';
      const type = this.detectStreamType(url, contentType);

      const info: StreamInfo = {
        type,
        url
      };

      // Parse HLS playlist for additional info
      if (type === 'hls' && typeof response.data === 'string') {
        const hlsInfo = this.parseHLSInfo(response.data);
        Object.assign(info, hlsInfo);
      }

      return info;
    } catch (error) {
      return {
        type: 'unknown',
        url
      };
    }
  }

  private detectStreamType(url: string, contentType: string): StreamType {
    const lowerUrl = url.toLowerCase();
    const lowerContentType = contentType.toLowerCase();

    // Check URL patterns
    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls/') || lowerUrl.includes('playlist.m3u8')) {
      return 'hls';
    }

    if (lowerUrl.includes('.mpd') || lowerUrl.includes('/dash/')) {
      return 'dash';
    }

    if (lowerUrl.includes('.ts') || lowerUrl.includes(':8000/') || lowerUrl.includes(':8080/')) {
      return 'mpegts';
    }

    if (lowerUrl.includes('.mp4')) {
      return 'mp4';
    }

    // Check content type
    if (lowerContentType.includes('mpegurl') || lowerContentType.includes('x-mpegurl')) {
      return 'hls';
    }

    if (lowerContentType.includes('dash') || lowerContentType.includes('mpd')) {
      return 'dash';
    }

    if (lowerContentType.includes('mpeg') || lowerContentType.includes('video/mp2t')) {
      return 'mpegts';
    }

    if (lowerContentType.includes('mp4')) {
      return 'mp4';
    }

    return 'unknown';
  }

  private parseHLSInfo(content: string): Partial<StreamInfo> {
    const info: Partial<StreamInfo> = {};

    // Look for resolution info
    const resolutionMatch = content.match(/RESOLUTION=(\d+x\d+)/i);
    if (resolutionMatch) {
      info.resolution = resolutionMatch[1];
    }

    // Look for bandwidth info
    const bandwidthMatch = content.match(/BANDWIDTH=(\d+)/i);
    if (bandwidthMatch) {
      info.bitrate = parseInt(bandwidthMatch[1], 10);
    }

    // Look for codecs
    const codecsMatch = content.match(/CODECS="([^"]+)"/i);
    if (codecsMatch) {
      info.codec = codecsMatch[1];
    }

    // Check if live stream
    info.isLive = !content.includes('#EXT-X-ENDLIST');

    return info;
  }

  // Helper to get stream headers for custom user-agent/referrer
  getStreamHeaders(userAgent?: string, referrer?: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (userAgent) {
      headers['User-Agent'] = userAgent;
    } else {
      headers['User-Agent'] = 'IPTV-Player/1.0';
    }

    if (referrer) {
      headers['Referer'] = referrer;
    }

    return headers;
  }

  // Build stream URL with potential proxy or modifications
  buildStreamUrl(
    url: string,
    _options?: {
      userAgent?: string;
      referrer?: string;
      proxy?: string;
    }
  ): string {
    // For now, return the URL as-is
    // In the future, this could handle proxy routing for CORS issues
    return url;
  }
}
