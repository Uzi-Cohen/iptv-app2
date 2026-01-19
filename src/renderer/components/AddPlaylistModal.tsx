import React, { useState } from 'react';

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUrl: (url: string) => Promise<void>;
  onAddFile: () => Promise<void>;
}

export const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({
  isOpen,
  onClose,
  onAddUrl,
  onAddFile
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await onAddUrl(url.trim());
      setUrl('');
      onClose();
    } catch (err) {
      setError('Failed to import playlist. Please check the URL and try again.');
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
    } catch (err) {
      setError('Failed to import playlist file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-[#1a1d29] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Add Playlist</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* URL Form */}
          <form onSubmit={handleSubmit}>
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a1d29] text-white/40">or</span>
            </div>
          </div>

          {/* File import button */}
          <button
            onClick={handleFileImport}
            disabled={isLoading}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10
              hover:border-white/20 rounded-xl font-medium transition-all
              flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import from File
          </button>

          {/* Info */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <h3 className="text-sm font-medium text-white/80 mb-2">Supported Formats</h3>
            <ul className="text-xs text-white/40 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                M3U / M3U8 playlists
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Extended M3U with logos & groups
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Xtream Codes API
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPlaylistModal;
