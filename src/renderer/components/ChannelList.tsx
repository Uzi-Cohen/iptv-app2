import React, { useState, useMemo } from 'react';

interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  playlistId: string;
  isFavorite: boolean;
}

interface EPGProgram {
  title: string;
  start: Date;
  end: Date;
}

interface ChannelListProps {
  channels: Channel[];
  currentChannel?: Channel;
  currentPrograms?: Record<string, EPGProgram | null>;
  onChannelSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
  isLoading?: boolean;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  currentChannel,
  currentPrograms = {},
  onChannelSelect,
  onToggleFavorite,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    channels.forEach(channel => {
      if (channel.group) {
        groupSet.add(channel.group);
      }
    });
    return Array.from(groupSet).sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = !searchQuery ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.tvgName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGroup = !selectedGroup || channel.group === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [channels, searchQuery, selectedGroup]);

  const getProgress = (program: EPGProgram | null): number => {
    if (!program) return 0;
    const now = new Date();
    const start = new Date(program.start);
    const end = new Date(program.end);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filters */}
      <div className="p-4 space-y-3 border-b border-dark-700">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Group filter */}
          <select
            value={selectedGroup || ''}
            onChange={e => setSelectedGroup(e.target.value || null)}
            className="input flex-1"
          >
            <option value="">All Groups</option>
            {groups.map(group => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex bg-dark-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-dark-600' : ''}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-dark-600' : ''}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Channel count */}
      <div className="px-4 py-2 text-sm text-dark-400 border-b border-dark-700">
        {filteredChannels.length} channels
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {viewMode === 'list' ? (
          <div className="divide-y divide-dark-700/50">
            {filteredChannels.map((channel, index) => {
              const program = currentPrograms[channel.tvgId || channel.name];
              const isActive = currentChannel?.id === channel.id;

              return (
                <div
                  key={channel.id}
                  className={`channel-item ${isActive ? 'active' : ''}`}
                  onClick={() => onChannelSelect(channel)}
                >
                  {/* Channel number */}
                  <span className="w-8 text-center text-sm text-dark-500">
                    {index + 1}
                  </span>

                  {/* Channel logo */}
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="channel-logo"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23475569"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 10l3 4 3-4 4 5H5z"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="channel-logo flex items-center justify-center">
                      <svg className="w-6 h-6 text-dark-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 10l3 4 3-4 4 5H5z" />
                      </svg>
                    </div>
                  )}

                  {/* Channel info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{channel.name}</h4>
                    {program && (
                      <div className="mt-1">
                        <p className="text-sm text-dark-400 truncate">{program.title}</p>
                        <div className="mt-1 h-1 bg-dark-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 transition-all duration-1000"
                            style={{ width: `${getProgress(program)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!program && channel.group && (
                      <p className="text-sm text-dark-500 truncate">{channel.group}</p>
                    )}
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleFavorite(channel.id);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      channel.isFavorite
                        ? 'text-yellow-500 hover:text-yellow-400'
                        : 'text-dark-500 hover:text-dark-300'
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={channel.isFavorite ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-3 gap-3 p-4">
            {filteredChannels.map(channel => {
              const isActive = currentChannel?.id === channel.id;

              return (
                <div
                  key={channel.id}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all
                    ${isActive ? 'ring-2 ring-primary-500' : 'hover:ring-2 hover:ring-dark-600'}`}
                  onClick={() => onChannelSelect(channel)}
                >
                  <div className="aspect-video bg-dark-700 flex items-center justify-center">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg className="w-10 h-10 text-dark-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 10l3 4 3-4 4 5H5z" />
                      </svg>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-sm font-medium text-white truncate">{channel.name}</p>
                  </div>
                  {channel.isFavorite && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filteredChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-dark-400">
            <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No channels found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelList;
