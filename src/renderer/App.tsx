import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from './components/VideoPlayer';
import AddPlaylistModal from './components/AddPlaylistModal';

interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  playlistId: string;
  isFavorite: boolean;
  userAgent?: string;
  referrer?: string;
}

interface Playlist {
  id: string;
  name: string;
  channelCount: number;
}

const App: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get unique groups
  const groups = React.useMemo(() => {
    const groupSet = new Set<string>();
    channels
      .filter(c => !selectedPlaylist || c.playlistId === selectedPlaylist)
      .forEach(c => c.group && groupSet.add(c.group));
    return Array.from(groupSet).sort();
  }, [channels, selectedPlaylist]);

  // Filter channels
  const filteredChannels = React.useMemo(() => {
    let filtered = channels;
    if (selectedPlaylist) {
      filtered = filtered.filter(c => c.playlistId === selectedPlaylist);
    }
    if (selectedGroup) {
      filtered = filtered.filter(c => c.group === selectedGroup);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [channels, selectedPlaylist, selectedGroup, searchQuery]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [playlistsData, channelsData] = await Promise.all([
          window.api.getAllPlaylists(),
          window.api.getChannels()
        ]);
        setPlaylists(playlistsData || []);
        setChannels(channelsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddPlaylist = useCallback(async (url: string) => {
    const playlist = await window.api.importPlaylist(url);
    if (playlist) {
      setPlaylists(await window.api.getAllPlaylists());
      setChannels(await window.api.getChannels());
    }
  }, []);

  const handleDeletePlaylist = useCallback(async (id: string) => {
    if (confirm('Delete this playlist?')) {
      await window.api.deletePlaylist(id);
      setPlaylists(await window.api.getAllPlaylists());
      setChannels(await window.api.getChannels());
      if (selectedPlaylist === id) {
        setSelectedPlaylist(null);
        setSelectedGroup(null);
      }
    }
  }, [selectedPlaylist]);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">IPTV Player</h1>
        </div>

        {/* Add Playlist Button */}
        <div className="p-3">
          <button
            onClick={() => setShowAddPlaylist(true)}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
          >
            + Add Playlist
          </button>
        </div>

        {/* Playlists */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs text-gray-400 uppercase">Playlists</div>
          <button
            onClick={() => { setSelectedPlaylist(null); setSelectedGroup(null); }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
              !selectedPlaylist ? 'bg-gray-700 text-blue-400' : ''
            }`}
          >
            All Channels ({channels.length})
          </button>
          {playlists.map(playlist => (
            <div
              key={playlist.id}
              className={`group flex items-center hover:bg-gray-700 ${
                selectedPlaylist === playlist.id ? 'bg-gray-700' : ''
              }`}
            >
              <button
                onClick={() => { setSelectedPlaylist(playlist.id); setSelectedGroup(null); }}
                className={`flex-1 text-left px-4 py-2 text-sm truncate ${
                  selectedPlaylist === playlist.id ? 'text-blue-400' : ''
                }`}
              >
                {playlist.name} ({playlist.channelCount})
              </button>
              <button
                onClick={() => handleDeletePlaylist(playlist.id)}
                className="px-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}

          {/* Groups */}
          {groups.length > 0 && (
            <>
              <div className="px-3 py-2 mt-4 text-xs text-gray-400 uppercase">Categories</div>
              <button
                onClick={() => setSelectedGroup(null)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                  !selectedGroup ? 'bg-gray-700 text-blue-400' : ''
                }`}
              >
                All
              </button>
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 truncate ${
                    selectedGroup === group ? 'bg-gray-700 text-blue-400' : ''
                  }`}
                >
                  {group}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-4 py-2 text-sm
              focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Channel List */}
          <div className="w-80 border-r border-gray-700 overflow-y-auto">
            {filteredChannels.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {channels.length === 0 ? (
                  <>
                    <p className="mb-4">No channels yet</p>
                    <button
                      onClick={() => setShowAddPlaylist(true)}
                      className="text-blue-400 hover:underline"
                    >
                      Add a playlist to get started
                    </button>
                  </>
                ) : (
                  <p>No channels found</p>
                )}
              </div>
            ) : (
              filteredChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setCurrentChannel(channel)}
                  className={`w-full text-left p-3 hover:bg-gray-800 border-b border-gray-700/50 flex items-center gap-3 ${
                    currentChannel?.id === channel.id ? 'bg-gray-800 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt=""
                      className="w-10 h-10 rounded bg-gray-700 object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-500">TV</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{channel.name}</div>
                    {channel.group && (
                      <div className="text-xs text-gray-500 truncate">{channel.group}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Player Area */}
          <div className="flex-1 bg-black flex items-center justify-center">
            {currentChannel ? (
              <div className="w-full h-full relative">
                <VideoPlayer
                  url={currentChannel.url}
                  autoplay={true}
                  userAgent={currentChannel.userAgent}
                  referrer={currentChannel.referrer}
                />
                {/* Channel Info Overlay */}
                <div className="absolute top-4 left-4 bg-black/70 rounded px-3 py-2">
                  <div className="text-sm font-medium">{currentChannel.name}</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center">
                <div className="text-6xl mb-4">📺</div>
                <p>Select a channel to start watching</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Playlist Modal */}
      <AddPlaylistModal
        isOpen={showAddPlaylist}
        onClose={() => setShowAddPlaylist(false)}
        onAddUrl={handleAddPlaylist}
        onAddFile={async () => {
          const playlist = await window.api.importPlaylistFile();
          if (playlist) {
            setPlaylists(await window.api.getAllPlaylists());
            setChannels(await window.api.getChannels());
          }
        }}
      />
    </div>
  );
};

export default App;
