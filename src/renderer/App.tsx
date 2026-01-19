import React, { useState, useEffect, useCallback, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer';
import Settings from './components/Settings';
import AddPlaylistModal from './components/AddPlaylistModal';

// Types
interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  playlistId: string;
  isFavorite: boolean;
  userAgent?: string;
  referrer?: string;
}

interface Playlist {
  id: string;
  name: string;
  url: string;
  channelCount: number;
  lastUpdated: string;
}

interface EPGProgram {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category?: string;
}

interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  autoplay: boolean;
  volume: number;
  muted: boolean;
  bufferSize: number;
  epgRefreshInterval: number;
  playlistRefreshInterval: number;
  hardwareAcceleration: boolean;
  lowLatencyMode: boolean;
  showChannelNumbers: boolean;
  rememberLastChannel: boolean;
  language: string;
}

type View = 'home' | 'search' | 'favorites' | 'history' | 'settings';

const defaultSettings: AppSettings = {
  theme: 'dark',
  autoplay: true,
  volume: 100,
  muted: false,
  bufferSize: 30,
  epgRefreshInterval: 24,
  playlistRefreshInterval: 24,
  hardwareAcceleration: true,
  lowLatencyMode: false,
  showChannelNumbers: true,
  rememberLastChannel: true,
  language: 'en'
};

// Channel Card Component (Disney+ style)
const ChannelCard: React.FC<{
  channel: Channel;
  isPlaying: boolean;
  currentProgram?: EPGProgram | null;
  onClick: () => void;
  onFavorite: () => void;
  showNumber?: number;
}> = ({ channel, isPlaying, currentProgram, onClick, onFavorite, showNumber }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getProgress = () => {
    if (!currentProgram) return 0;
    const now = new Date();
    const start = new Date(currentProgram.start);
    const end = new Date(currentProgram.end);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <div
      className={`relative flex-shrink-0 w-[200px] rounded-lg overflow-hidden cursor-pointer
        transition-all duration-300 ease-out group
        ${isHovered ? 'scale-110 z-20 shadow-2xl shadow-black/50' : 'scale-100'}
        ${isPlaying ? 'ring-2 ring-white' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
        {channel.logo && !imageError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/50 to-purple-900/50">
            <svg className="w-12 h-12 text-white/30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 10l3 4 3-4 4 5H5z" />
            </svg>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-2 left-2 bg-red-500 px-2 py-0.5 rounded text-xs font-bold">
            LIVE
          </div>
        )}

        {/* Channel number */}
        {showNumber && (
          <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs">
            {showNumber}
          </div>
        )}

        {/* Favorite button (visible on hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all
            ${channel.isFavorite ? 'bg-yellow-500 text-black' : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'}`}
        >
          <svg className="w-4 h-4" fill={channel.isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        {/* Progress bar for current program */}
        {currentProgram && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-blue-500" style={{ width: `${getProgress()}%` }} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Info panel (expanded on hover) */}
      <div className={`bg-[#1a1d29] transition-all duration-300 ${isHovered ? 'p-3' : 'p-2'}`}>
        <h3 className="font-semibold text-white truncate text-sm">{channel.name}</h3>
        {isHovered && currentProgram && (
          <p className="text-xs text-white/60 mt-1 truncate">{currentProgram.title}</p>
        )}
        {isHovered && channel.group && !currentProgram && (
          <p className="text-xs text-white/60 mt-1 truncate">{channel.group}</p>
        )}
      </div>
    </div>
  );
};

// Horizontal scroll row component
const ChannelRow: React.FC<{
  title: string;
  channels: Channel[];
  currentChannel?: Channel;
  currentPrograms: Record<string, EPGProgram | null>;
  onChannelSelect: (channel: Channel) => void;
  onToggleFavorite: (id: string) => void;
  showNumbers?: boolean;
}> = ({ title, channels, currentChannel, currentPrograms, onChannelSelect, onToggleFavorite, showNumbers }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      setCanScrollRight(
        scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
      );
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [channels]);

  if (channels.length === 0) return null;

  return (
    <div className="relative group/row mb-8">
      <h2 className="text-xl font-bold mb-4 px-12">{title}</h2>

      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-[#0d1117] to-transparent
              flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-4 -my-4"
        >
          {channels.map((channel, index) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isPlaying={currentChannel?.id === channel.id}
              currentProgram={currentPrograms[channel.tvgId || channel.name]}
              onClick={() => onChannelSelect(channel)}
              onFavorite={() => onToggleFavorite(channel.id)}
              showNumber={showNumbers ? index + 1 : undefined}
            />
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[#0d1117] to-transparent
              flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [currentPrograms, setCurrentPrograms] = useState<Record<string, EPGProgram | null>>({});
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [history, setHistory] = useState<Channel[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Group channels by category
  const channelsByGroup = React.useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    channels.forEach(channel => {
      const group = channel.group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(channel);
    });
    return groups;
  }, [channels]);

  // Search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return channels.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.group?.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [playlistsData, channelsData, favoritesData, historyData, settingsData] = await Promise.all([
          window.api.getAllPlaylists(),
          window.api.getChannels(),
          window.api.getFavorites(),
          window.api.getHistory(),
          window.api.getSettings()
        ]);

        setPlaylists(playlistsData || []);
        setChannels(channelsData || []);
        setFavorites(favoritesData || []);
        setHistory((historyData || []).map((h: { channel: Channel }) => h.channel));
        setSettings({ ...defaultSettings, ...settingsData });
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load EPG data for visible channels
  useEffect(() => {
    const loadEPG = async () => {
      const programs: Record<string, EPGProgram | null> = {};
      for (const channel of channels.slice(0, 50)) {
        try {
          const program = await window.api.getCurrentProgram(channel.tvgId || channel.name);
          if (program) {
            programs[channel.tvgId || channel.name] = program;
          }
        } catch {
          // Ignore EPG errors
        }
      }
      setCurrentPrograms(programs);
    };

    if (channels.length > 0) {
      loadEPG();
      const interval = setInterval(loadEPG, 60000);
      return () => clearInterval(interval);
    }
  }, [channels]);

  const handleChannelSelect = useCallback(async (channel: Channel) => {
    setCurrentChannel(channel);
    setShowPlayer(true);
    await window.api.addToHistory(channel.id);

    // Update history
    setHistory(prev => {
      const filtered = prev.filter(c => c.id !== channel.id);
      return [channel, ...filtered].slice(0, 20);
    });
  }, []);

  const handleToggleFavorite = useCallback(async (channelId: string) => {
    const newStatus = await window.api.toggleFavorite(channelId);
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, isFavorite: newStatus } : c));
    setFavorites(await window.api.getFavorites());
  }, []);

  const handleAddPlaylist = useCallback(async (url: string) => {
    const playlist = await window.api.importPlaylist(url);
    if (playlist) {
      setPlaylists(await window.api.getAllPlaylists());
      setChannels(await window.api.getChannels());
    }
  }, []);

  const handleAddPlaylistFile = useCallback(async () => {
    const playlist = await window.api.importPlaylistFile();
    if (playlist) {
      setPlaylists(await window.api.getAllPlaylists());
      setChannels(await window.api.getChannels());
    }
  }, []);

  const handleDeletePlaylist = useCallback(async (id: string) => {
    await window.api.deletePlaylist(id);
    setPlaylists(await window.api.getAllPlaylists());
    setChannels(await window.api.getChannels());
  }, []);

  const handleRefreshPlaylist = useCallback(async (id: string) => {
    await window.api.refreshPlaylist(id);
    setPlaylists(await window.api.getAllPlaylists());
    setChannels(await window.api.getChannels());
  }, []);

  const handleImportEPG = useCallback(async (url: string) => {
    return await window.api.importEPG(url);
  }, []);

  const handleSettingsChange = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await window.api.setSettings(newSettings);
  }, [settings]);

  // Render settings page
  if (view === 'settings') {
    return (
      <Settings
        settings={settings}
        playlists={playlists}
        onSettingsChange={handleSettingsChange}
        onDeletePlaylist={handleDeletePlaylist}
        onRefreshPlaylist={handleRefreshPlaylist}
        onImportEPG={handleImportEPG}
        onBack={() => setView('home')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#0d1117] via-[#0d1117]/95 to-transparent">
        <div className="flex items-center justify-between px-12 py-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 10l3 4 3-4 4 5H5z" />
                </svg>
              </div>
              <span className="text-xl font-bold">IPTV</span>
            </div>

            {/* Nav links */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setView('home')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors
                  ${view === 'home' ? 'text-white' : 'text-white/60 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span>Home</span>
              </button>

              <button
                onClick={() => setView('search')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors
                  ${view === 'search' ? 'text-white' : 'text-white/60 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </button>

              <button
                onClick={() => setView('favorites')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors
                  ${view === 'favorites' ? 'text-white' : 'text-white/60 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span>Favorites</span>
              </button>

              <button
                onClick={() => setView('history')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors
                  ${view === 'history' ? 'text-white' : 'text-white/60 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>History</span>
              </button>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAddPlaylist(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              Add Playlist
            </button>
            <button
              onClick={() => setView('settings')}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="pt-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : view === 'search' ? (
          /* Search View */
          <div className="px-12 py-8">
            <div className="max-w-2xl mx-auto mb-12">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="w-full bg-white/10 border-0 rounded-full pl-14 pr-6 py-4 text-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/40"
                  autoFocus
                />
              </div>
            </div>

            {searchQuery && searchResults.length > 0 && (
              <ChannelRow
                title={`Results for "${searchQuery}"`}
                channels={searchResults}
                currentChannel={currentChannel || undefined}
                currentPrograms={currentPrograms}
                onChannelSelect={handleChannelSelect}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-20 text-white/40">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl">No channels found</p>
              </div>
            )}
          </div>
        ) : view === 'favorites' ? (
          /* Favorites View */
          <div className="py-8">
            <h1 className="text-3xl font-bold mb-8 px-12">My Favorites</h1>
            {favorites.length > 0 ? (
              <ChannelRow
                title=""
                channels={favorites}
                currentChannel={currentChannel || undefined}
                currentPrograms={currentPrograms}
                onChannelSelect={handleChannelSelect}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <div className="text-center py-20 text-white/40">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className="text-xl">No favorites yet</p>
                <p className="text-sm mt-2">Click the star on any channel to add it here</p>
              </div>
            )}
          </div>
        ) : view === 'history' ? (
          /* History View */
          <div className="py-8">
            <h1 className="text-3xl font-bold mb-8 px-12">Watch History</h1>
            {history.length > 0 ? (
              <ChannelRow
                title=""
                channels={history}
                currentChannel={currentChannel || undefined}
                currentPrograms={currentPrograms}
                onChannelSelect={handleChannelSelect}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <div className="text-center py-20 text-white/40">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl">No history yet</p>
                <p className="text-sm mt-2">Channels you watch will appear here</p>
              </div>
            )}
          </div>
        ) : (
          /* Home View */
          <div className="py-8">
            {channels.length === 0 ? (
              /* Empty state */
              <div className="text-center py-20">
                <div className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">Welcome to IPTV Player</h2>
                <p className="text-white/50 mb-8 max-w-md mx-auto">
                  Add your first playlist to start watching live TV channels from around the world.
                </p>
                <button
                  onClick={() => setShowAddPlaylist(true)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                    rounded-full text-lg font-semibold transition-all hover:scale-105"
                >
                  Add Your First Playlist
                </button>
              </div>
            ) : (
              /* Channel rows by group */
              <>
                {/* Continue Watching (if has history) */}
                {history.length > 0 && (
                  <ChannelRow
                    title="Continue Watching"
                    channels={history.slice(0, 10)}
                    currentChannel={currentChannel || undefined}
                    currentPrograms={currentPrograms}
                    onChannelSelect={handleChannelSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {/* Favorites row */}
                {favorites.length > 0 && (
                  <ChannelRow
                    title="My Favorites"
                    channels={favorites}
                    currentChannel={currentChannel || undefined}
                    currentPrograms={currentPrograms}
                    onChannelSelect={handleChannelSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {/* Channel groups */}
                {Object.entries(channelsByGroup).map(([group, groupChannels]) => (
                  <ChannelRow
                    key={group}
                    title={group}
                    channels={groupChannels}
                    currentChannel={currentChannel || undefined}
                    currentPrograms={currentPrograms}
                    onChannelSelect={handleChannelSelect}
                    onToggleFavorite={handleToggleFavorite}
                    showNumbers={settings.showChannelNumbers}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      {showPlayer && currentChannel && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Close button */}
          <button
            onClick={() => setShowPlayer(false)}
            className="absolute top-6 left-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Channel info */}
          <div className="absolute top-6 right-6 z-10 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
            {currentChannel.logo && (
              <img src={currentChannel.logo} alt="" className="w-8 h-8 rounded object-cover" />
            )}
            <div>
              <p className="font-medium">{currentChannel.name}</p>
              {currentPrograms[currentChannel.tvgId || currentChannel.name] && (
                <p className="text-sm text-white/60">
                  {currentPrograms[currentChannel.tvgId || currentChannel.name]?.title}
                </p>
              )}
            </div>
          </div>

          <VideoPlayer
            url={currentChannel.url}
            autoplay={settings.autoplay}
            userAgent={currentChannel.userAgent}
            referrer={currentChannel.referrer}
          />
        </div>
      )}

      {/* Add Playlist Modal */}
      <AddPlaylistModal
        isOpen={showAddPlaylist}
        onClose={() => setShowAddPlaylist(false)}
        onAddUrl={handleAddPlaylist}
        onAddFile={handleAddPlaylistFile}
      />
    </div>
  );
};

export default App;
