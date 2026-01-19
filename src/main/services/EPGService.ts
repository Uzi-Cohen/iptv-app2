import axios from 'axios';
import * as pako from 'pako';
import { v4 as uuidv4 } from 'uuid';
import { EPGSource, EPGProgram, EPGChannel } from '../../shared/types';
import { StorageService } from './StorageService';

interface ParsedChannel {
  id: string;
  displayName: string;
  icon?: string;
}

interface ParsedProgram {
  channel: string;
  title: string;
  description?: string;
  category?: string;
  start: string;
  stop: string;
  icon?: string;
}

export class EPGService {
  private epgChannelMap: Map<string, EPGChannel> = new Map();

  constructor(private storageService: StorageService) {}

  async importEPG(url: string): Promise<boolean> {
    try {
      console.log('Importing EPG from:', url);

      const response = await axios.get(url, {
        timeout: 120000,
        headers: {
          'User-Agent': 'IPTV-Player/1.0',
          'Accept-Encoding': 'gzip, deflate'
        },
        responseType: 'arraybuffer'
      });

      let content: string;
      const data = new Uint8Array(response.data);

      // Check if content is gzipped
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

  /**
   * Simple XMLTV parser using regex
   */
  private parseXMLTV(xml: string): { channels: ParsedChannel[]; programs: ParsedProgram[] } {
    const channels: ParsedChannel[] = [];
    const programs: ParsedProgram[] = [];

    // Parse channels
    const channelRegex = /<channel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;
    let channelMatch;
    while ((channelMatch = channelRegex.exec(xml)) !== null) {
      const id = channelMatch[1];
      const content = channelMatch[2];

      const displayNameMatch = content.match(/<display-name[^>]*>([^<]+)<\/display-name>/i);
      const iconMatch = content.match(/<icon\s+src="([^"]+)"/i);

      channels.push({
        id,
        displayName: displayNameMatch ? this.decodeXmlEntities(displayNameMatch[1]) : id,
        icon: iconMatch ? iconMatch[1] : undefined
      });
    }

    // Parse programs
    const programRegex = /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/gi;
    let programMatch;
    while ((programMatch = programRegex.exec(xml)) !== null) {
      const start = programMatch[1];
      const stop = programMatch[2];
      const channel = programMatch[3];
      const content = programMatch[4];

      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = content.match(/<desc[^>]*>([^<]+)<\/desc>/i);
      const categoryMatch = content.match(/<category[^>]*>([^<]+)<\/category>/i);
      const iconMatch = content.match(/<icon\s+src="([^"]+)"/i);

      if (titleMatch) {
        programs.push({
          channel,
          title: this.decodeXmlEntities(titleMatch[1]),
          description: descMatch ? this.decodeXmlEntities(descMatch[1]) : undefined,
          category: categoryMatch ? this.decodeXmlEntities(categoryMatch[1]) : undefined,
          start,
          stop,
          icon: iconMatch ? iconMatch[1] : undefined
        });
      }
    }

    return { channels, programs };
  }

  private decodeXmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  }

  private async parseAndSaveEPG(content: string, url: string): Promise<boolean> {
    try {
      const parsed = this.parseXMLTV(content);

      if (parsed.programs.length === 0) {
        console.warn('No programs found in EPG');
        return false;
      }

      console.log(`Parsed ${parsed.channels.length} channels and ${parsed.programs.length} programs`);

      // Clear old programs
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

      // Build channel map
      for (const channel of parsed.channels) {
        const epgChannel: EPGChannel = {
          id: channel.id,
          displayName: channel.displayName,
          icon: channel.icon
        };
        this.epgChannelMap.set(channel.id.toLowerCase(), epgChannel);
      }

      // Convert programs
      const programs: EPGProgram[] = [];
      const now = new Date();

      for (const program of parsed.programs) {
        const start = this.parseEPGDate(program.start);
        const end = this.parseEPGDate(program.stop);

        if (!start || !end) continue;
        if (end < now) continue; // Skip past programs

        programs.push({
          id: uuidv4(),
          channelId: program.channel,
          title: program.title,
          description: program.description,
          start,
          end,
          category: program.category,
          icon: program.icon
        });
      }

      // Save in batches
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

  private parseEPGDate(dateStr: string): Date | null {
    try {
      // XMLTV date format: YYYYMMDDHHmmss +HHMM
      const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);

      if (!match) {
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
    const ids: string[] = [channelId, channelId.toLowerCase()];

    ids.push(`${channelId}.us`);
    ids.push(`${channelId}.uk`);

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
