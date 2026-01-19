import axios from 'axios';
import * as pako from 'pako';
import { v4 as uuidv4 } from 'uuid';
import { parse as parseEPG } from 'epg-parser';
import { EPGSource, EPGProgram, EPGChannel } from '../../shared/types';
import { StorageService } from './StorageService';

interface ParsedEPGChannel {
  id: string;
  displayName: { value: string }[];
  icon?: { src: string }[];
  url?: { value: string }[];
}

interface ParsedEPGProgram {
  channel: string;
  title: { value: string }[];
  desc?: { value: string }[];
  category?: { value: string }[];
  icon?: { src: string }[];
  rating?: { value: string }[];
  episodeNum?: { value: string; system?: string }[];
  start: string;
  stop: string;
}

interface ParsedEPG {
  channels: ParsedEPGChannel[];
  programs: ParsedEPGProgram[];
}

export class EPGService {
  private epgChannelMap: Map<string, EPGChannel> = new Map();

  constructor(private storageService: StorageService) {
    this.initializeChannelMap();
  }

  private initializeChannelMap(): void {
    // This would be populated from stored EPG data
  }

  async importEPG(url: string): Promise<boolean> {
    try {
      console.log('Importing EPG from:', url);

      const response = await axios.get(url, {
        timeout: 120000, // 2 minutes for large EPG files
        headers: {
          'User-Agent': 'IPTV-Player/1.0',
          'Accept-Encoding': 'gzip, deflate'
        },
        responseType: 'arraybuffer'
      });

      let content: string;
      const data = new Uint8Array(response.data);

      // Check if content is gzipped (magic bytes: 1f 8b)
      if (data[0] === 0x1f && data[1] === 0x8b) {
        try {
          const decompressed = pako.inflate(data);
          content = new TextDecoder('utf-8').decode(decompressed);
        } catch {
          console.error('Failed to decompress gzipped EPG');
          return false;
        }
      } else {
        content = new TextDecoder('utf-8').decode(data);
      }

      return this.parseAndSaveEPG(content, url);
    } catch (error) {
      console.error('Error importing EPG:', error);
      return false;
    }
  }

  private async parseAndSaveEPG(content: string, url: string): Promise<boolean> {
    try {
      // Parse the XMLTV content
      const parsed: ParsedEPG = parseEPG(content);

      if (!parsed.programs || parsed.programs.length === 0) {
        console.warn('No programs found in EPG');
        return false;
      }

      console.log(`Parsed ${parsed.channels?.length || 0} channels and ${parsed.programs.length} programs`);

      // Clear old programs (older than 1 day ago)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      this.storageService.clearOldEPGPrograms(yesterday);

      // Save EPG source
      const source: EPGSource = {
        id: uuidv4(),
        url,
        lastUpdated: new Date().toISOString()
      };
      this.storageService.saveEPGSource(source);

      // Build channel map for lookups
      if (parsed.channels) {
        for (const channel of parsed.channels) {
          const epgChannel: EPGChannel = {
            id: channel.id,
            displayName: channel.displayName?.[0]?.value || channel.id,
            icon: channel.icon?.[0]?.src,
            url: channel.url?.[0]?.value
          };
          this.epgChannelMap.set(channel.id.toLowerCase(), epgChannel);
        }
      }

      // Convert programs to our format
      const programs: EPGProgram[] = parsed.programs.map(program =>
        this.convertToEPGProgram(program)
      ).filter((p): p is EPGProgram => p !== null);

      // Save in batches to avoid memory issues
      const batchSize = 5000;
      for (let i = 0; i < programs.length; i += batchSize) {
        const batch = programs.slice(i, i + batchSize);
        this.storageService.saveEPGPrograms(batch);
      }

      console.log(`Saved ${programs.length} EPG programs`);
      return true;
    } catch (error) {
      console.error('Error parsing EPG:', error);
      return false;
    }
  }

  private convertToEPGProgram(program: ParsedEPGProgram): EPGProgram | null {
    try {
      const start = this.parseEPGDate(program.start);
      const stop = this.parseEPGDate(program.stop);

      if (!start || !stop) {
        return null;
      }

      // Skip programs that have already ended
      if (stop < new Date()) {
        return null;
      }

      // Parse episode number if available
      let season: number | undefined;
      let episode: number | undefined;
      let episodeNum: string | undefined;

      if (program.episodeNum) {
        for (const ep of program.episodeNum) {
          if (ep.system === 'xmltv_ns') {
            // Format: season.episode.part (0-indexed)
            const parts = ep.value.split('.');
            if (parts[0]) {
              const s = parseInt(parts[0], 10);
              if (!isNaN(s)) season = s + 1;
            }
            if (parts[1]) {
              const e = parseInt(parts[1], 10);
              if (!isNaN(e)) episode = e + 1;
            }
          } else if (ep.system === 'onscreen') {
            episodeNum = ep.value;
          }
        }
      }

      return {
        id: uuidv4(),
        channelId: program.channel,
        title: program.title?.[0]?.value || 'Unknown',
        description: program.desc?.[0]?.value,
        start,
        end: stop,
        category: program.category?.[0]?.value,
        icon: program.icon?.[0]?.src,
        rating: program.rating?.[0]?.value,
        episodeNum,
        season,
        episode
      };
    } catch (error) {
      console.error('Error converting EPG program:', error);
      return null;
    }
  }

  private parseEPGDate(dateStr: string): Date | null {
    try {
      // XMLTV date format: YYYYMMDDHHmmss +HHMM
      const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);

      if (!match) {
        // Try ISO format
        return new Date(dateStr);
      }

      const [, year, month, day, hour, minute, second, tz] = match;

      let isoStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

      if (tz) {
        isoStr += `${tz.slice(0, 3)}:${tz.slice(3)}`;
      } else {
        isoStr += 'Z';
      }

      return new Date(isoStr);
    } catch {
      return null;
    }
  }

  getProgramsForChannel(channelId: string, hoursAhead: number = 24): EPGProgram[] {
    const from = new Date();
    const to = new Date();
    to.setHours(to.getHours() + hoursAhead);

    // Try different channel ID formats
    const channelIds = this.getPossibleChannelIds(channelId);

    for (const id of channelIds) {
      const programs = this.storageService.getEPGPrograms(id, from, to);
      if (programs.length > 0) {
        return programs;
      }
    }

    return [];
  }

  getCurrentProgram(channelId: string): EPGProgram | null {
    const channelIds = this.getPossibleChannelIds(channelId);

    for (const id of channelIds) {
      const program = this.storageService.getCurrentProgram(id);
      if (program) {
        return program;
      }
    }

    return null;
  }

  private getPossibleChannelIds(channelId: string): string[] {
    // Different ways a channel might be identified in EPG
    const ids: string[] = [channelId];

    // Try lowercase
    ids.push(channelId.toLowerCase());

    // Try with common suffixes
    ids.push(`${channelId}.us`);
    ids.push(`${channelId}.uk`);

    // Try without common domain suffixes
    const withoutSuffix = channelId.replace(/\.(com|us|uk|tv|net)$/i, '');
    if (withoutSuffix !== channelId) {
      ids.push(withoutSuffix);
    }

    return [...new Set(ids)];
  }

  getEPGChannel(channelId: string): EPGChannel | undefined {
    return this.epgChannelMap.get(channelId.toLowerCase());
  }
}
