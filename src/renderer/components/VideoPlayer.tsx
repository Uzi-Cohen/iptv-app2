import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  autoplay?: boolean;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  autoplay = true,
  onError,
  onLoadStart,
  onLoadEnd
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initializePlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    destroyHls();
    setIsLoading(true);
    setError(null);
    onLoadStart?.();

    console.log('[VideoPlayer] Loading:', url);

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 30000,
        manifestLoadingTimeOut: 30000,
        levelLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] Manifest parsed, starting playback');
        setIsLoading(false);
        setRetryCount(0);
        onLoadEnd?.();
        if (autoplay) {
          video.play().catch(e => console.log('[VideoPlayer] Autoplay blocked:', e));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[VideoPlayer] HLS Error:', data.type, data.details);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[VideoPlayer] Network error, trying to recover...');
              if (retryCount < 3) {
                setRetryCount(prev => prev + 1);
                setTimeout(() => hls.startLoad(), 1000);
              } else {
                setError('Network error - stream unavailable');
                onError?.('Network error');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[VideoPlayer] Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              // Try direct playback as fallback
              console.log('[VideoPlayer] Fatal error, trying direct playback...');
              destroyHls();
              tryDirectPlayback(video, url);
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      setupVideoEvents(video);
    } else {
      // Direct playback
      tryDirectPlayback(video, url);
    }
  }, [url, autoplay, onError, onLoadStart, onLoadEnd, destroyHls, retryCount]);

  const tryDirectPlayback = (video: HTMLVideoElement, streamUrl: string) => {
    console.log('[VideoPlayer] Trying direct playback');
    video.src = streamUrl;
    setupVideoEvents(video);
  };

  const setupVideoEvents = (video: HTMLVideoElement) => {
    const onLoaded = () => {
      console.log('[VideoPlayer] Video loaded');
      setIsLoading(false);
      onLoadEnd?.();
      if (autoplay) {
        video.play().catch(e => console.log('[VideoPlayer] Autoplay blocked:', e));
      }
    };

    const onVideoError = () => {
      setIsLoading(false);
      const mediaError = video.error;
      let errorMsg = 'Failed to load stream';
      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = 'Playback aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = 'Network error';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = 'Decode error';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = 'Format not supported';
            break;
        }
      }
      console.error('[VideoPlayer] Error:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    };

    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('canplay', onLoaded, { once: true });
    video.addEventListener('error', onVideoError, { once: true });
  };

  useEffect(() => {
    initializePlayer();
    return () => destroyHls();
  }, [url]); // Only re-init on URL change

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="relative bg-black w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center p-8">
            <div className="text-red-500 text-4xl mb-4">⚠</div>
            <p className="text-white mb-2">Stream Error</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => { setRetryCount(0); initializePlayer(); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={togglePlay} className="text-white">
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button onClick={toggleMute} className="text-white">
            {isMuted ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20"
          />

          <div className="flex-1" />

          <button onClick={toggleFullscreen} className="text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
