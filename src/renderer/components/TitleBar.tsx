import React from 'react';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title }) => {
  const handleMinimize = () => window.api.minimize();
  const handleMaximize = () => window.api.maximize();
  const handleClose = () => window.api.close();

  return (
    <div className="h-10 bg-dark-900 border-b border-dark-700 flex items-center justify-between drag-region">
      <div className="px-4 flex items-center gap-2 no-drag">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>

      <div className="text-sm text-dark-400 font-medium">
        {title || 'IPTV Player'}
      </div>

      <div className="flex items-center no-drag">
        <button
          onClick={handleMinimize}
          className="w-12 h-10 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-10 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-10 flex items-center justify-center text-dark-400 hover:text-white hover:bg-red-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
