import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  Playlist,
  Channel,
  EPGProgram,
  EPGSource,
  HistoryEntry,
  Settings,
  defaultSettings
} from '../../shared/types';

export class StorageService {
  private db: Database.Database;
  private settings: Settings;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'iptv-player.db');

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
    this.settings = this.loadSettings();
  }

  private initializeTables(): void {
    // Playlists table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT,
        file_path TEXT,
        channel_count INTEGER DEFAULT 0,
        last_updated TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Channels table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        logo TEXT,
        group_name TEXT,
        tvg_id TEXT,
        tvg_name TEXT,
        tvg_logo TEXT,
        language TEXT,
        country TEXT,
        playlist_id TEXT NOT NULL,
        is_favorite INTEGER DEFAULT 0,
        user_agent TEXT,
        referrer TEXT,
        catchup_type TEXT,
        catchup_days INTEGER,
        catchup_source TEXT,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for channels
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_channels_playlist ON channels(playlist_id);
      CREATE INDEX IF NOT EXISTS idx_channels_group ON channels(group_name);
      CREATE INDEX IF NOT EXISTS idx_channels_tvg_id ON channels(tvg_id);
      CREATE INDEX IF NOT EXISTS idx_channels_favorite ON channels(is_favorite);
    `);

    // EPG Sources table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS epg_sources (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        last_updated TEXT
      )
    `);

    // EPG Programs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS epg_programs (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        category TEXT,
        icon TEXT,
        rating TEXT,
        episode_num TEXT,
        season INTEGER,
        episode INTEGER
      )
    `);

    // Create indexes for EPG
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_epg_channel ON epg_programs(channel_id);
      CREATE INDEX IF NOT EXISTS idx_epg_start ON epg_programs(start_time);
      CREATE INDEX IF NOT EXISTS idx_epg_end ON epg_programs(end_time);
    `);

    // History table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        duration INTEGER,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Favorites table (separate for quick access)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        channel_id TEXT PRIMARY KEY,
        added_at TEXT NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
      )
    `);
  }

  // Playlist methods
  savePlaylist(playlist: Playlist): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO playlists (id, name, url, file_path, channel_count, last_updated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      playlist.id,
      playlist.name,
      playlist.url,
      playlist.filePath || null,
      playlist.channelCount,
      playlist.lastUpdated,
      playlist.createdAt
    );
  }

  getAllPlaylists(): Playlist[] {
    const stmt = this.db.prepare('SELECT * FROM playlists ORDER BY created_at DESC');
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      url: string;
      file_path: string | null;
      channel_count: number;
      last_updated: string;
      created_at: string;
    }>;
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      filePath: row.file_path || undefined,
      channelCount: row.channel_count,
      lastUpdated: row.last_updated,
      createdAt: row.created_at
    }));
  }

  getPlaylist(id: string): Playlist | null {
    const stmt = this.db.prepare('SELECT * FROM playlists WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      name: string;
      url: string;
      file_path: string | null;
      channel_count: number;
      last_updated: string;
      created_at: string;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      filePath: row.file_path || undefined,
      channelCount: row.channel_count,
      lastUpdated: row.last_updated,
      createdAt: row.created_at
    };
  }

  deletePlaylist(id: string): void {
    const stmt = this.db.prepare('DELETE FROM playlists WHERE id = ?');
    stmt.run(id);
  }

  updatePlaylistChannelCount(id: string, count: number): void {
    const stmt = this.db.prepare('UPDATE playlists SET channel_count = ?, last_updated = ? WHERE id = ?');
    stmt.run(count, new Date().toISOString(), id);
  }

  // Channel methods
  saveChannels(channels: Channel[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO channels
      (id, name, url, logo, group_name, tvg_id, tvg_name, tvg_logo, language, country,
       playlist_id, is_favorite, user_agent, referrer, catchup_type, catchup_days, catchup_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((channels: Channel[]) => {
      for (const channel of channels) {
        stmt.run(
          channel.id,
          channel.name,
          channel.url,
          channel.logo || null,
          channel.group || null,
          channel.tvgId || null,
          channel.tvgName || null,
          channel.tvgLogo || null,
          channel.language || null,
          channel.country || null,
          channel.playlistId,
          channel.isFavorite ? 1 : 0,
          channel.userAgent || null,
          channel.referrer || null,
          channel.catchup?.type || null,
          channel.catchup?.days || null,
          channel.catchup?.source || null
        );
      }
    });

    insertMany(channels);
  }

  getChannels(playlistId?: string, group?: string): Channel[] {
    let query = 'SELECT * FROM channels WHERE 1=1';
    const params: (string | number)[] = [];

    if (playlistId) {
      query += ' AND playlist_id = ?';
      params.push(playlistId);
    }
    if (group) {
      query += ' AND group_name = ?';
      params.push(group);
    }

    query += ' ORDER BY name ASC';
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Array<{
      id: string;
      name: string;
      url: string;
      logo: string | null;
      group_name: string | null;
      tvg_id: string | null;
      tvg_name: string | null;
      tvg_logo: string | null;
      language: string | null;
      country: string | null;
      playlist_id: string;
      is_favorite: number;
      user_agent: string | null;
      referrer: string | null;
      catchup_type: string | null;
      catchup_days: number | null;
      catchup_source: string | null;
    }>;

    return rows.map(row => this.mapRowToChannel(row));
  }

  searchChannels(query: string): Channel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM channels
      WHERE name LIKE ? OR tvg_name LIKE ? OR group_name LIKE ?
      ORDER BY name ASC
    `);
    const searchTerm = `%${query}%`;
    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as Array<{
      id: string;
      name: string;
      url: string;
      logo: string | null;
      group_name: string | null;
      tvg_id: string | null;
      tvg_name: string | null;
      tvg_logo: string | null;
      language: string | null;
      country: string | null;
      playlist_id: string;
      is_favorite: number;
      user_agent: string | null;
      referrer: string | null;
      catchup_type: string | null;
      catchup_days: number | null;
      catchup_source: string | null;
    }>;

    return rows.map(row => this.mapRowToChannel(row));
  }

  getChannel(id: string): Channel | null {
    const stmt = this.db.prepare('SELECT * FROM channels WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      name: string;
      url: string;
      logo: string | null;
      group_name: string | null;
      tvg_id: string | null;
      tvg_name: string | null;
      tvg_logo: string | null;
      language: string | null;
      country: string | null;
      playlist_id: string;
      is_favorite: number;
      user_agent: string | null;
      referrer: string | null;
      catchup_type: string | null;
      catchup_days: number | null;
      catchup_source: string | null;
    } | undefined;
    if (!row) return null;
    return this.mapRowToChannel(row);
  }

  getGroups(playlistId?: string): string[] {
    let query = 'SELECT DISTINCT group_name FROM channels WHERE group_name IS NOT NULL';
    const params: string[] = [];

    if (playlistId) {
      query += ' AND playlist_id = ?';
      params.push(playlistId);
    }

    query += ' ORDER BY group_name ASC';
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Array<{ group_name: string }>;
    return rows.map(row => row.group_name);
  }

  deleteChannelsByPlaylist(playlistId: string): void {
    const stmt = this.db.prepare('DELETE FROM channels WHERE playlist_id = ?');
    stmt.run(playlistId);
  }

  private mapRowToChannel(row: {
    id: string;
    name: string;
    url: string;
    logo: string | null;
    group_name: string | null;
    tvg_id: string | null;
    tvg_name: string | null;
    tvg_logo: string | null;
    language: string | null;
    country: string | null;
    playlist_id: string;
    is_favorite: number;
    user_agent: string | null;
    referrer: string | null;
    catchup_type: string | null;
    catchup_days: number | null;
    catchup_source: string | null;
  }): Channel {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      logo: row.logo || row.tvg_logo || undefined,
      group: row.group_name || undefined,
      tvgId: row.tvg_id || undefined,
      tvgName: row.tvg_name || undefined,
      tvgLogo: row.tvg_logo || undefined,
      language: row.language || undefined,
      country: row.country || undefined,
      playlistId: row.playlist_id,
      isFavorite: row.is_favorite === 1,
      userAgent: row.user_agent || undefined,
      referrer: row.referrer || undefined,
      catchup: row.catchup_type ? {
        type: row.catchup_type as 'default' | 'flussonic' | 'xc' | 'shift',
        days: row.catchup_days || undefined,
        source: row.catchup_source || undefined
      } : undefined
    };
  }

  // Favorites methods
  toggleFavorite(channelId: string): boolean {
    const channel = this.getChannel(channelId);
    if (!channel) return false;

    const newStatus = !channel.isFavorite;
    const stmt = this.db.prepare('UPDATE channels SET is_favorite = ? WHERE id = ?');
    stmt.run(newStatus ? 1 : 0, channelId);

    if (newStatus) {
      const favStmt = this.db.prepare('INSERT OR REPLACE INTO favorites (channel_id, added_at) VALUES (?, ?)');
      favStmt.run(channelId, new Date().toISOString());
    } else {
      const favStmt = this.db.prepare('DELETE FROM favorites WHERE channel_id = ?');
      favStmt.run(channelId);
    }

    return newStatus;
  }

  getFavorites(): Channel[] {
    const stmt = this.db.prepare(`
      SELECT c.* FROM channels c
      INNER JOIN favorites f ON c.id = f.channel_id
      ORDER BY f.added_at DESC
    `);
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      url: string;
      logo: string | null;
      group_name: string | null;
      tvg_id: string | null;
      tvg_name: string | null;
      tvg_logo: string | null;
      language: string | null;
      country: string | null;
      playlist_id: string;
      is_favorite: number;
      user_agent: string | null;
      referrer: string | null;
      catchup_type: string | null;
      catchup_days: number | null;
      catchup_source: string | null;
    }>;
    return rows.map(row => this.mapRowToChannel(row));
  }

  // EPG methods
  saveEPGSource(source: EPGSource): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO epg_sources (id, url, last_updated)
      VALUES (?, ?, ?)
    `);
    stmt.run(source.id, source.url, source.lastUpdated);
  }

  saveEPGPrograms(programs: EPGProgram[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO epg_programs
      (id, channel_id, title, description, start_time, end_time, category, icon, rating, episode_num, season, episode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((programs: EPGProgram[]) => {
      for (const program of programs) {
        stmt.run(
          program.id,
          program.channelId,
          program.title,
          program.description || null,
          program.start.toISOString(),
          program.end.toISOString(),
          program.category || null,
          program.icon || null,
          program.rating || null,
          program.episodeNum || null,
          program.season || null,
          program.episode || null
        );
      }
    });

    insertMany(programs);
  }

  getEPGPrograms(channelId: string, from?: Date, to?: Date): EPGProgram[] {
    let query = 'SELECT * FROM epg_programs WHERE channel_id = ?';
    const params: (string | number)[] = [channelId];

    if (from) {
      query += ' AND end_time >= ?';
      params.push(from.toISOString());
    }
    if (to) {
      query += ' AND start_time <= ?';
      params.push(to.toISOString());
    }

    query += ' ORDER BY start_time ASC';
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Array<{
      id: string;
      channel_id: string;
      title: string;
      description: string | null;
      start_time: string;
      end_time: string;
      category: string | null;
      icon: string | null;
      rating: string | null;
      episode_num: string | null;
      season: number | null;
      episode: number | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      title: row.title,
      description: row.description || undefined,
      start: new Date(row.start_time),
      end: new Date(row.end_time),
      category: row.category || undefined,
      icon: row.icon || undefined,
      rating: row.rating || undefined,
      episodeNum: row.episode_num || undefined,
      season: row.season || undefined,
      episode: row.episode || undefined
    }));
  }

  getCurrentProgram(channelId: string): EPGProgram | null {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM epg_programs
      WHERE channel_id = ? AND start_time <= ? AND end_time >= ?
      LIMIT 1
    `);
    const row = stmt.get(channelId, now, now) as {
      id: string;
      channel_id: string;
      title: string;
      description: string | null;
      start_time: string;
      end_time: string;
      category: string | null;
      icon: string | null;
      rating: string | null;
      episode_num: string | null;
      season: number | null;
      episode: number | null;
    } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      channelId: row.channel_id,
      title: row.title,
      description: row.description || undefined,
      start: new Date(row.start_time),
      end: new Date(row.end_time),
      category: row.category || undefined,
      icon: row.icon || undefined,
      rating: row.rating || undefined,
      episodeNum: row.episode_num || undefined,
      season: row.season || undefined,
      episode: row.episode || undefined
    };
  }

  clearOldEPGPrograms(olderThan: Date): void {
    const stmt = this.db.prepare('DELETE FROM epg_programs WHERE end_time < ?');
    stmt.run(olderThan.toISOString());
  }

  // History methods
  addToHistory(channelId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO history (id, channel_id, timestamp) VALUES (?, ?, ?)
    `);
    stmt.run(uuidv4(), channelId, new Date().toISOString());
  }

  getHistory(limit: number = 50): HistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT h.*, c.* FROM history h
      INNER JOIN channels c ON h.channel_id = c.id
      ORDER BY h.timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{
      id: string;
      channel_id: string;
      timestamp: string;
      duration: number | null;
      name: string;
      url: string;
      logo: string | null;
      group_name: string | null;
      tvg_id: string | null;
      tvg_name: string | null;
      tvg_logo: string | null;
      language: string | null;
      country: string | null;
      playlist_id: string;
      is_favorite: number;
      user_agent: string | null;
      referrer: string | null;
      catchup_type: string | null;
      catchup_days: number | null;
      catchup_source: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      timestamp: row.timestamp,
      duration: row.duration || undefined,
      channel: this.mapRowToChannel(row)
    }));
  }

  clearHistory(): void {
    this.db.exec('DELETE FROM history');
  }

  // Settings methods
  private loadSettings(): Settings {
    const stmt = this.db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as Array<{ key: string; value: string }>;

    const loaded: Partial<Settings> = {};
    for (const row of rows) {
      try {
        loaded[row.key as keyof Settings] = JSON.parse(row.value);
      } catch {
        loaded[row.key as keyof Settings] = row.value as never;
      }
    }

    return { ...defaultSettings, ...loaded };
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  setSettings(newSettings: Partial<Settings>): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    const updateMany = this.db.transaction((settings: Partial<Settings>) => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, JSON.stringify(value));
        this.settings[key as keyof Settings] = value as never;
      }
    });

    updateMany(newSettings);
  }

  // Cleanup
  close(): void {
    this.db.close();
  }
}
