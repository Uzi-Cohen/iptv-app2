import React, { useState } from 'react';

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUrl: (url: string) => Promise<void>;
  onAddFile: () => Promise<void>;
}

type Tab = 'url' | 'xtream' | 'file';

export const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({
  isOpen,
  onClose,
  onAddUrl,
  onAddFile
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Xtream fields
  const [xtreamName, setXtreamName] = useState('');
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setUrl('');
    setXtreamName('');
    setXtreamHost('');
    setXtreamUsername('');
    setXtreamPassword('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await onAddUrl(url.trim());
      resetForm();
      onClose();
    } catch {
      setError('Failed to import playlist. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleXtreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xtreamHost.trim() || !xtreamUsername.trim() || !xtreamPassword.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build Xtream URL from fields
      let host = xtreamHost.trim();
      // Ensure host has protocol
      if (!host.startsWith('http://') && !host.startsWith('https://')) {
        host = 'http://' + host;
      }
      // Remove trailing slash
      host = host.replace(/\/$/, '');

      const xtreamUrl = `${host}/player_api.php?username=${encodeURIComponent(xtreamUsername.trim())}&password=${encodeURIComponent(xtreamPassword.trim())}`;

      await onAddUrl(xtreamUrl);
      resetForm();
      onClose();
    } catch {
      setError('Failed to connect to Xtream server. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onAddFile();
      onClose();
    } catch {
      setError('Failed to import playlist file.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'url' as const, label: 'URL', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )},
    { id: 'xtream' as const, label: 'Xtream Codes', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    )},
    { id: 'file' as const, label: 'File', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )}
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#1a1d29] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Add Playlist</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit}>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Playlist URL
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/playlist.m3u"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5
                  text-white placeholder-white/30
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all"
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-white/40">
                Supports M3U, M3U8, and Xtream Codes get.php URLs
              </p>

              <button
                type="submit"
                disabled={!url.trim() || isLoading}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600
                  hover:from-blue-600 hover:to-purple-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  rounded-xl font-semibold transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </span>
                ) : (
                  'Add Playlist'
                )}
              </button>
            </form>
          )}

          {/* Xtream Codes Tab */}
          {activeTab === 'xtream' && (
            <form onSubmit={handleXtreamSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={xtreamName}
                    onChange={e => setXtreamName(e.target.value)}
                    placeholder="My IPTV"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                      text-white placeholder-white/30
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Host <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={xtreamHost}
                    onChange={e => setXtreamHost(e.target.value)}
                    placeholder="http://server.com:8000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                      text-white placeholder-white/30
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={xtreamUsername}
                    onChange={e => setXtreamUsername(e.target.value)}
                    placeholder="username"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                      text-white placeholder-white/30
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={xtreamPassword}
                    onChange={e => setXtreamPassword(e.target.value)}
                    placeholder="password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                      text-white placeholder-white/30
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!xtreamHost.trim() || !xtreamUsername.trim() || !xtreamPassword.trim() || isLoading}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600
                  hover:from-blue-600 hover:to-purple-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  rounded-xl font-semibold transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Connect'
                )}
              </button>
            </form>
          )}

          {/* File Tab */}
          {activeTab === 'file' && (
            <div>
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-white/40 transition-colors">
                <svg className="w-12 h-12 mx-auto mb-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-white/60 mb-4">Select an M3U or M3U8 file from your computer</p>
                <button
                  onClick={handleFileImport}
                  disabled={isLoading}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    'Browse Files'
                  )}
                </button>
              </div>

              <p className="mt-4 text-xs text-white/40 text-center">
                Supported formats: .m3u, .m3u8
              </p>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <h3 className="text-sm font-medium text-white/80 mb-2">Supported Sources</h3>
            <ul className="text-xs text-white/40 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                M3U / M3U8 playlists
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Xtream Codes API (player_api.php)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Local playlist files
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPlaylistModal;
