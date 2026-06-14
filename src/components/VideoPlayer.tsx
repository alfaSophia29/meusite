
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowsPointingOutIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { motion } from 'motion/react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  isReel?: boolean;
  onPlayChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (time: number) => void;
  initialTime?: number;
  initialIsPlaying?: boolean;
}

// Global state for video settings sync
let globalMuted = true;
let globalVolume = 1;
let activeVideoElement: HTMLVideoElement | null = null;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  poster, 
  autoPlay = false, 
  loop = false, 
  className = '', 
  isReel = false, 
  onPlayChange,
  onTimeUpdate,
  initialTime = 0,
  initialIsPlaying = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  
  const lastNotifiedPlayState = useRef(initialIsPlaying);

  useEffect(() => {
    if (lastNotifiedPlayState.current !== isPlaying) {
      onPlayChange?.(isPlaying);
      lastNotifiedPlayState.current = isPlaying;
    }
  }, [isPlaying, onPlayChange]);

  const [isMuted, setIsMuted] = useState(globalMuted);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(globalVolume);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Sync with global settings
  useEffect(() => {
    const handleGlobalMute = (e: any) => {
      setIsMuted(e.detail.muted);
      if (videoRef.current) videoRef.current.muted = e.detail.muted;
    };
    const handleGlobalVolume = (e: any) => {
      setVolume(e.detail.volume);
      if (videoRef.current) videoRef.current.volume = e.detail.volume;
    };

    window.addEventListener('video-global-mute', handleGlobalMute);
    window.addEventListener('video-global-volume', handleGlobalVolume);
    return () => {
      window.removeEventListener('video-global-mute', handleGlobalMute);
      window.removeEventListener('video-global-volume', handleGlobalVolume);
    };
  }, []);

  // Initial state setup
  useEffect(() => {
    if (videoRef.current) {
        if (initialTime > 0) videoRef.current.currentTime = initialTime;
        videoRef.current.muted = isMuted;
        videoRef.current.volume = volume;
        if (initialIsPlaying) videoRef.current.play().catch(() => {});
    }
  }, [src]);

  useEffect(() => {
    if (!autoPlay || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (activeVideoElement && activeVideoElement !== videoRef.current) {
                activeVideoElement.pause();
            }
            activeVideoElement = videoRef.current;
            videoRef.current?.play().catch(() => setIsPlaying(false));
            setIsPlaying(true);
          } else {
            if (activeVideoElement === videoRef.current) {
                videoRef.current?.pause();
                setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlay]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        if (activeVideoElement && activeVideoElement !== videoRef.current) {
            activeVideoElement.pause();
        }
        activeVideoElement = videoRef.current;
        videoRef.current.play().catch((err) => {
          console.log("Play interrupted or prevented by browser policy:", err);
        });
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    globalMuted = newMuted;
    window.dispatchEvent(new CustomEvent('video-global-mute', { detail: { muted: newMuted } }));
    
    if (newMuted === false && volume === 0) {
      const newVolume = 0.5;
      globalVolume = newVolume;
      window.dispatchEvent(new CustomEvent('video-global-volume', { detail: { volume: newVolume } }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    globalVolume = newVolume;
    window.dispatchEvent(new CustomEvent('video-global-volume', { detail: { volume: newVolume } }));
    
    if (newVolume === 0 && !isMuted) {
      globalMuted = true;
      window.dispatchEvent(new CustomEvent('video-global-mute', { detail: { muted: true } }));
    } else if (newVolume > 0 && isMuted) {
      globalMuted = false;
      window.dispatchEvent(new CustomEvent('video-global-mute', { detail: { muted: false } }));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime || 0;
      const total = videoRef.current.duration || 0;
      setCurrentTime(current);
      setDuration(total);
      
      if (total > 0 && !isNaN(total) && isFinite(total)) {
        setProgress((current / total) * 100);
      } else {
        setProgress(0);
      }
      onTimeUpdate?.(current);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * (videoRef.current.duration || 0);
      videoRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const [lastTap, setLastTap] = useState(0);
  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap logic should be handled by parent or a callback
      // But we can trigger a visual effect here if we want
    } else {
      togglePlay(e);
    }
    setLastTap(now);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-black overflow-hidden flex items-center justify-center ${className}`}
      onMouseEnter={() => !isReel && setShowControls(true)}
      onMouseLeave={() => !isReel && isPlaying && setShowControls(false)}
    >
      <video 
        ref={videoRef}
        src={src}
        poster={poster}
        className={`w-full h-full outline-none ring-0 select-none ${isReel ? 'object-cover' : 'object-contain'}`}
        muted={isMuted}
        loop={loop}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onClick={isReel ? togglePlay : undefined}
        onLoadedMetadata={handleTimeUpdate}
      />

      {/* Central Play Button UI - only show momentarily or if paused */}
      {!isPlaying && !isReel && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 cursor-pointer" onClick={togglePlay}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-2xl transition-transform hover:scale-110">
            <PlayIcon className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Reel Pause/Play indicator */}
      {isReel && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
           <motion.div 
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-20 h-20 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
           >
              <PlayIcon className="h-10 w-10 fill-current" />
           </motion.div>
        </div>
      )}

      {/* Mute Toggle Overlay (Visible for both, positioned differently) */}
      <button 
        onClick={toggleMute}
        className={`absolute z-20 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-black/60 transition-all outline-none focus:outline-none focus:ring-0 focus:ring-transparent ${
          isReel ? 'top-6 right-6' : 'bottom-16 right-4 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
      </button>

      {/* Controls Bar - YouTube Style */}
      {!isReel ? (
        <div className={`absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'} select-none`}>
          {/* Progress Bar Container */}
          <div className="relative w-full h-[3px] group/progress mb-2 cursor-pointer transition-all hover:h-[5px]">
            <input 
              type="range" 
              min="0" max="100" step="0.1"
              value={isNaN(progress) ? 0 : progress} 
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
            {/* Background */}
            <div className="absolute inset-y-0 left-0 w-full h-full bg-white/20 rounded-full"></div>
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 h-full bg-red-600 rounded-full transition-all" style={{ width: `${progress}%` }}>
              {/* Knob */}
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg border border-white/10"></div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 md:gap-5">
              <div className="flex items-center gap-1.5">
                <button onClick={togglePlay} className="text-white p-1 hover:text-red-500 transition-colors focus:outline-none focus:ring-0">
                  {isPlaying ? <PauseIcon className="h-6 w-6 stroke-2 fill-current" /> : <PlayIcon className="h-6 w-6 stroke-2 fill-current" />}
                </button>
                
                <div 
                  className="flex items-center gap-1 group/volume relative"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button onClick={toggleMute} className="text-white p-1 hover:text-red-500 transition-colors focus:outline-none focus:ring-0">
                    {isMuted || volume === 0 ? <SpeakerXMarkIcon className="h-6 w-6 stroke-2" /> : <SpeakerWaveIcon className="h-6 w-6 stroke-2" />}
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 flex items-center ${showVolumeSlider ? 'w-16 md:w-20 opacity-100' : 'w-0 opacity-0'}`}>
                    <input 
                      type="range"
                      min="0" max="1" step="0.01"
                      value={isMuted ? 0 : (isNaN(volume) ? 1 : volume)}
                      onChange={handleVolumeChange}
                      className="w-full h-1 bg-white/30 accent-red-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="text-[12px] font-medium text-white tabular-nums flex items-center gap-1.5 ml-2">
                  <span>{formatTime(currentTime)}</span>
                  <span className="opacity-50">/</span>
                  <span className="opacity-90">{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="text-white p-1 hover:rotate-90 hover:text-red-500 transition-all hidden sm:block focus:outline-none focus:ring-0">
                <Cog6ToothIcon className="h-5 w-5 stroke-2" />
              </button>
              <button onClick={handleFullscreen} className="text-white p-1 hover:scale-110 hover:text-red-500 transition-all focus:outline-none focus:ring-0">
                <ArrowsPointingOutIcon className="h-5 w-5 stroke-2" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Reel Progress Line at the very bottom */
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20 z-30">
          <motion.div 
            className="h-full bg-white" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
