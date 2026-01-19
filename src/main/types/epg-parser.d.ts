declare module 'epg-parser' {
  interface EPGChannel {
    id: string;
    displayName: { value: string; lang?: string }[];
    icon?: { src: string }[];
    url?: { value: string }[];
  }

  interface EPGProgram {
    channel: string;
    title: { value: string; lang?: string }[];
    desc?: { value: string; lang?: string }[];
    category?: { value: string; lang?: string }[];
    icon?: { src: string }[];
    rating?: { value: string; system?: string }[];
    episodeNum?: { value: string; system?: string }[];
    start: string;
    stop: string;
    date?: string;
    credits?: {
      director?: { value: string }[];
      actor?: { value: string; role?: string }[];
      writer?: { value: string }[];
      producer?: { value: string }[];
    };
  }

  interface ParsedEPG {
    channels: EPGChannel[];
    programs: EPGProgram[];
  }

  export function parse(xml: string): ParsedEPG;
}
