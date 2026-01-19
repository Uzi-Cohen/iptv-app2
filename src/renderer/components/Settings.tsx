import React, { useState } from 'react';

interface Settings {
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

interface Playlist {
  id: string;
  name: string;
  url: string;
  channelCount: number;
  lastUpdated: string;
}

interface SettingsProps {
  settings: Settings;
  playlists: Playlist[];
  onSettingsChange: (settings: Partial<Settings>) => void;
  onDeletePlaylist: (id: string) => void;
  onRefreshPlaylist: (id: string) => void;
  onImportEPG: (url: string) => Promise<boolean>;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  playlists,
  onSettingsChange,
  onDeletePlaylist,
  onRefreshPlaylist,
  onImportEPG,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'playback' | 'playlists' | 'epg' | 'about'>('general');
  const [epgUrl, setEpgUrl] = useState('');
  const [isImportingEPG, setIsImportingEPG] = useState(false);

  const handleEPGImport = async () => {
    if (!epgUrl.trim()) return;
    setIsImportingEPG(true);
    try {
      await onImportEPG(epgUrl.trim());
      setEpgUrl('');
    } finally {
      setIsImportingEPG(false);
    }
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-blue-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'playback', label: 'Playback' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'epg', label: 'TV Guide' },
    { id: 'about', label: 'About' }
  ] as const;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[#0d1117] via-[#0d1117] to-transparent pb-8">
        <div className="flex items-center gap-4 px-12 pt-6">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-12 mt-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-12 pb-12 max-w-4xl">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6 space-y-5">
              <h3 className="text-lg font-semibold text-white/90">Appearance</h3>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Show Channel Numbers</p>
                  <p className="text-sm text-white/50">Display numbers in channel list</p>
                </div>
                <Toggle
                  enabled={settings.showChannelNumbers}
                  onChange={() => onSettingsChange({ showChannelNumbers: !settings.showChannelNumbers })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Remember Last Channel</p>
                  <p className="text-sm text-white/50">Resume from last watched</p>
                </div>
                <Toggle
                  enabled={settings.rememberLastChannel}
                  onChange={() => onSettingsChange({ rememberLastChannel: !settings.rememberLastChannel })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playback' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6 space-y-5">
              <h3 className="text-lg font-semibold text-white/90">Video Settings</h3>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Autoplay</p>
                  <p className="text-sm text-white/50">Auto-start when selecting channel</p>
                </div>
                <Toggle
                  enabled={settings.autoplay}
                  onChange={() => onSettingsChange({ autoplay: !settings.autoplay })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Hardware Acceleration</p>
                  <p className="text-sm text-white/50">Use GPU for video decoding</p>
                </div>
                <Toggle
                  enabled={settings.hardwareAcceleration}
                  onChange={() => onSettingsChange({ hardwareAcceleration: !settings.hardwareAcceleration })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Low Latency Mode</p>
                  <p className="text-sm text-white/50">Reduce stream delay</p>
                </div>
                <Toggle
                  enabled={settings.lowLatencyMode}
                  onChange={() => onSettingsChange({ lowLatencyMode: !settings.lowLatencyMode })}
                />
              </div>

              <div className="py-2">
                <div className="flex justify-between mb-3">
                  <p className="font-medium">Buffer Size</p>
                  <span className="text-blue-400">{settings.bufferSize}s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={settings.bufferSize}
                  onChange={e => onSettingsChange({ bufferSize: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              <div className="py-2">
                <div className="flex justify-between mb-3">
                  <p className="font-medium">Default Volume</p>
                  <span className="text-blue-400">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={e => onSettingsChange({ volume: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white/90">Your Playlists</h3>
                <select
                  value={settings.playlistRefreshInterval}
                  onChange={e => onSettingsChange({ playlistRefreshInterval: parseInt(e.target.value) })}
                  className="bg-white/10 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Manual refresh</option>
                  <option value="12">Refresh every 12h</option>
                  <option value="24">Refresh every 24h</option>
                </select>
              </div>

              {playlists.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p>No playlists added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {playlists.map(playlist => (
                    <div key={playlist.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{playlist.name}</h4>
                        <p className="text-sm text-white/40">{playlist.channelCount} channels</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => onRefreshPlaylist(playlist.id)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeletePlaylist(playlist.id)}
                          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'epg' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white/90 mb-4">Import EPG Data</h3>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={epgUrl}
                  onChange={e => setEpgUrl(e.target.value)}
                  placeholder="https://example.com/epg.xml"
                  className="flex-1 bg-white/10 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 placeholder-white/30"
                />
                <button
                  onClick={handleEPGImport}
                  disabled={!epgUrl.trim() || isImportingEPG}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl font-medium transition-colors"
                >
                  {isImportingEPG ? 'Importing...' : 'Import'}
                </button>
              </div>
              <p className="text-sm text-white/40 mt-2">Supports XMLTV format</p>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 10l3 4 3-4 4 5H5z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2">IPTV Player</h2>
              <p className="text-white/50 mb-6">Version 1.0.0</p>
              <p className="text-white/70 max-w-md mx-auto">
                A modern IPTV streaming app with M3U playlist support, EPG integration, and HLS streaming.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
