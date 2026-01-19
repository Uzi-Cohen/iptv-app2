import React, { useState, useEffect } from 'react';

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
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Xtream fields
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = window.api.onImportProgress((data) => {
      setProgressStatus(data.status);
      setProgressPercent(data.percent);
    });
    return cleanup;
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setUrl('');
    setXtreamHost('');
    setXtreamUsername('');
    setXtreamPassword('');
    setError(null);
    setProgressStatus('');
    setProgressPercent(0);
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
      setError('Failed to import playlist');
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
      let host = xtreamHost.trim();
      if (!host.startsWith('http://') && !host.startsWith('https://')) {
        host = 'http://' + host;
      }
      host = host.replace(/\/$/, '');
      const xtreamUrl = `${host}/player_api.php?username=${encodeURIComponent(xtreamUsername.trim())}&password=${encodeURIComponent(xtreamPassword.trim())}`;
      await onAddUrl(xtreamUrl);
      resetForm();
      onClose();
    } catch {
      setError('Failed to connect');
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
      setError('Failed to import file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div
        className="bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Playlist</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-700 rounded p-1">
          {(['url', 'xtream', 'file'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(null); }}
              className={`flex-1 py-2 px-3 rounded text-sm ${
                activeTab === tab ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'url' ? 'URL' : tab === 'xtream' ? 'Xtream' : 'File'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {isLoading && progressPercent > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{progressStatus}</span>
              <span className="text-gray-400">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <form onSubmit={handleUrlSubmit}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/playlist.m3u"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 mb-4
                focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!url.trim() || isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium"
            >
              {isLoading ? 'Importing...' : 'Add Playlist'}
            </button>
          </form>
        )}

        {activeTab === 'xtream' && (
          <form onSubmit={handleXtreamSubmit}>
            <input
              type="text"
              value={xtreamHost}
              onChange={e => setXtreamHost(e.target.value)}
              placeholder="Server (http://server.com:8000)"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 mb-3
                focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <input
              type="text"
              value={xtreamUsername}
              onChange={e => setXtreamUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 mb-3
                focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <input
              type="password"
              value={xtreamPassword}
              onChange={e => setXtreamPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 mb-4
                focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!xtreamHost.trim() || !xtreamUsername.trim() || !xtreamPassword.trim() || isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        )}

        {activeTab === 'file' && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Select an M3U file</p>
            <button
              onClick={handleFileImport}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium"
            >
              {isLoading ? 'Importing...' : 'Browse Files'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPlaylistModal;
