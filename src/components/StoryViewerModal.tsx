import React, { useState, useEffect, useRef } from 'react';
import { GroupedStory, User } from '../types';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  EyeIcon, 
  PlayIcon, 
  PauseIcon,
  UserIcon
} from '@heroicons/react/24/solid';
import { markStoryAsViewed, getUsers } from '../services/storageService';

interface StoryViewerModalProps {
  stories: GroupedStory[];
  initialIndex: number;
  onClose: () => void;
  currentUser: User;
}

const formatStoryTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (minutes < 1) return 'Agora mesmo';
  if (minutes < 60) return `há ${minutes}m`;
  if (hours < 24) return `há ${hours}h`;
  return new Date(timestamp).toLocaleDateString();
};

const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ 
  stories, 
  initialIndex, 
  onClose, 
  currentUser 
}) => {
  const [currentUserGroupIndex, setCurrentUserGroupIndex] = useState(initialIndex);
  const [currentStoryItemIndex, setCurrentStoryItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const totalDuration = 5000; // 5 seconds per story
  const intervalTime = 30; // update progress every 30ms

  const activeGroup = stories[currentUserGroupIndex];
  const activeStoryItem = activeGroup?.items[currentStoryItemIndex];
  const isOwnStory = activeGroup?.userId === currentUser.id;

  // Load all users to look up view names
  useEffect(() => {
    getUsers(currentUser)
      .then(users => {
        setAllUsers(users);
      })
      .catch(err => {
        console.error("Error loading users for story viewers list:", err);
      });
  }, [currentUser]);

  // When changing group index, start at the first unviewed story of this group (or default to 0)
  useEffect(() => {
    const group = stories[currentUserGroupIndex];
    if (group) {
      const firstUnviewed = group.items.findIndex(
        item => !item.views?.includes(currentUser.id)
      );
      setCurrentStoryItemIndex(firstUnviewed !== -1 ? firstUnviewed : 0);
      setProgress(0);
    }
  }, [currentUserGroupIndex, stories, currentUser.id]);

  // Reset progress and handle marking as viewed when current item changes
  useEffect(() => {
    if (!activeStoryItem) return;

    setProgress(0);

    // Optimistically and safely add current user to viewed array
    if (!activeStoryItem.views) {
      activeStoryItem.views = [];
    }

    if (!activeStoryItem.views.includes(currentUser.id)) {
      activeStoryItem.views.push(currentUser.id);
      
      // Update database asynchronously
      markStoryAsViewed(activeStoryItem.id, currentUser.id).catch(err => {
        console.error("Error marking story as viewed:", err);
      });
    }
  }, [currentStoryItemIndex, currentUserGroupIndex, activeStoryItem, currentUser.id]);

  const goToNextStoryItem = () => {
    const group = stories[currentUserGroupIndex];
    if (!group) return;

    if (currentStoryItemIndex < group.items.length - 1) {
      setCurrentStoryItemIndex(prev => prev + 1);
    } else {
      // Go to next user group if available, otherwise close
      if (currentUserGroupIndex < stories.length - 1) {
        setCurrentUserGroupIndex(prev => prev + 1);
      } else {
        onClose();
      }
    }
  };

  const goToPrevStoryItem = () => {
    if (currentStoryItemIndex > 0) {
      setCurrentStoryItemIndex(prev => prev - 1);
    } else {
      // Go to previous user group if available
      if (currentUserGroupIndex > 0) {
        const prevGroup = stories[currentUserGroupIndex - 1];
        setCurrentUserGroupIndex(prev => prev - 1);
        setCurrentStoryItemIndex(prevGroup.items.length - 1);
      } else {
        // First item of first user, just restart
        setProgress(0);
      }
    }
  };

  // Main autoplay tick
  useEffect(() => {
    if (isPaused || showViewers) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          goToNextStoryItem();
          return 0;
        }
        return prev + (intervalTime / totalDuration) * 100;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentUserGroupIndex, currentStoryItemIndex, isPaused, showViewers, stories]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goToNextStoryItem();
      } else if (e.key === 'ArrowLeft') {
        goToPrevStoryItem();
      } else if (e.key === ' ') {
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentUserGroupIndex, currentStoryItemIndex]);

  if (!activeGroup || !activeStoryItem) return null;

  // Find people who viewed this story
  const viewersList = allUsers.filter(u => activeStoryItem.views?.includes(u.id));

  // Determine alignment on fonts
  const fontClasses = activeStoryItem.fontFamily || 'font-sans text-center text-white';

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center p-0 md:p-4 overflow-hidden select-none">
      {/* Immersive Blurry Atmospheric Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
        {activeStoryItem.imageUrl ? (
          <img 
            src={activeStoryItem.imageUrl} 
            alt="backdrop" 
            className={`w-full h-full object-cover blur-3xl scale-125 ${activeStoryItem.filter || ''}`} 
          />
        ) : (
          <div className={`w-full h-full blur-3xl scale-125 ${activeStoryItem.backgroundColor || 'bg-gradient-to-br from-indigo-900 to-purple-900'}`} />
        )}
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full h-full md:h-auto md:max-w-md md:aspect-[9/16] md:rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-[0_0_80px_rgba(0,0,0,0.85)] border-0 md:border border-zinc-800">
        
        {/* Story Header overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent z-40 pointer-events-auto">
          {/* Progress Bars */}
          <div className="flex gap-1.5 mb-4 px-1">
            {activeGroup.items.map((item, idx) => {
              let width = '0%';
              if (idx < currentStoryItemIndex) {
                width = '100%';
              } else if (idx === currentStoryItemIndex) {
                width = `${progress}%`;
              }
              return (
                <div key={item.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all ease-linear" 
                    style={{ 
                      width, 
                      transitionDuration: idx === currentStoryItemIndex ? `${intervalTime}ms` : '0ms' 
                    }} 
                  />
                </div>
              );
            })}
          </div>

          {/* User Info & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={activeGroup.userProfilePic || '/default-avatar.png'} 
                alt={activeGroup.userName} 
                className="w-10 h-10 rounded-full object-cover border border-white/20" 
              />
              <div>
                <h4 className="text-white font-black text-sm drop-shadow leading-tight">{activeGroup.userName}</h4>
                <p className="text-white/60 text-[10px] font-medium tracking-tight mt-0.5">{formatStoryTime(activeStoryItem.timestamp)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsPaused(p => !p)} 
                className="text-white/75 hover:text-white p-2 rounded-xl bg-black/20 hover:bg-black/40 backdrop-blur-md transition-all active:scale-95"
              >
                {isPaused ? <PlayIcon className="h-5 w-5" /> : <PauseIcon className="h-5 w-5" />}
              </button>
              <button 
                onClick={onClose} 
                className="text-white/75 hover:text-white p-2 rounded-xl bg-black/20 hover:bg-black/40 backdrop-blur-md transition-all active:scale-95"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Content Canvas */}
        <div 
          className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {activeStoryItem.imageUrl ? (
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Image with blur background buffer */}
              <img 
                src={activeStoryItem.imageUrl} 
                className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 select-none pointer-events-none" 
                alt="blur ambient" 
              />
              <img 
                src={activeStoryItem.imageUrl} 
                className={`w-full h-full object-contain relative z-10 max-h-full ${activeStoryItem.filter || ''} select-none pointer-events-none`} 
                alt="story content" 
              />
              {/* Optional Caption */}
              {activeStoryItem.text && (
                <div className="absolute bottom-20 left-4 right-4 z-20 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm text-center font-medium drop-shadow-lg">
                  {activeStoryItem.text}
                </div>
              )}
            </div>
          ) : (
            /* Text-based story */
            <div className={`w-full h-full flex items-center justify-center p-8 ${activeStoryItem.backgroundColor || 'bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600'}`}>
              <div className={`${fontClasses} break-words max-w-full text-2xl font-bold leading-snug p-4 drop-shadow-md`}>
                {activeStoryItem.text}
              </div>
            </div>
          )}

          {/* Left/Right Click zones to navigate */}
          <div className="absolute inset-0 z-30 flex">
            <div 
              className="w-[35%] h-full cursor-w-resize" 
              onClick={(e) => {
                e.stopPropagation();
                goToPrevStoryItem();
              }} 
            />
            <div 
              className="w-[65%] h-full cursor-e-resize" 
              onClick={(e) => {
                e.stopPropagation();
                goToNextStoryItem();
              }} 
            />
          </div>
        </div>

        {/* Viewers bar at the bottom */}
        {isOwnStory && (
          <div className="absolute bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-auto">
            <button 
              onClick={() => {
                setIsPaused(true);
                setShowViewers(true);
              }}
              className="flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white text-xs font-black tracking-wider uppercase px-4 py-2.5 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
            >
              <EyeIcon className="h-4 w-4 text-purple-400" />
              <span>Visto por {viewersList.length}</span>
            </button>
          </div>
        )}

        {/* Desktop Side Navigation Buttons (chevrons outside the mobile frame area on desktop) */}
        {currentUserGroupIndex > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); goToPrevStoryItem(); }}
            className="hidden md:flex absolute left-[-60px] top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-3 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800 transition-all active:scale-90"
            title="Anterior"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        )}
        {(currentUserGroupIndex < stories.length - 1 || currentStoryItemIndex < activeGroup.items.length - 1) && (
          <button 
            onClick={(e) => { e.stopPropagation(); goToNextStoryItem(); }}
            className="hidden md:flex absolute right-[-60px] top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-3 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800 transition-all active:scale-90"
            title="Próximo"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        )}

        {/* Visual modern indicators of current group sequence */}
        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-white/50 bg-black/30 backdrop-blur px-2.5 py-1 rounded-md z-40 pointer-events-none">
          {currentUserGroupIndex + 1} / {stories.length}
        </div>

      </div>

      {/* Story Viewers Bottom Drawer (Bottom Sheet) */}
      {showViewers && (
        <div 
          className="fixed inset-0 z-[2100] bg-black/50 backdrop-blur-sm flex items-end justify-center animate-fade-in"
          onClick={() => {
            setShowViewers(false);
            setIsPaused(false);
          }}
        >
          <div 
            className="w-full max-w-md bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[60vh] flex flex-col overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-full flex justify-center py-3">
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
            </div>

            <div className="px-6 pb-4 flex justify-between items-center border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-5 w-5 text-purple-400" />
                <h3 className="text-white font-black text-base uppercase tracking-tight">Visualizações ({viewersList.length})</h3>
              </div>
              <button 
                onClick={() => {
                  setShowViewers(false);
                  setIsPaused(false);
                }}
                className="text-zinc-400 hover:text-white font-bold text-xs bg-zinc-800 hover:bg-zinc-750 px-3 py-1.5 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {viewersList.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <UserIcon className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                  <p className="text-sm font-semibold">Nenhum visualizador ainda</p>
                  <p className="text-xs text-zinc-600 mt-1">Seu history ficará ativo por 24h.</p>
                </div>
              ) : (
                viewersList.map(viewer => (
                  <div key={viewer.id} className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-3">
                      <img 
                        src={viewer.profilePicture || '/default-avatar.png'} 
                        alt={`${viewer.firstName} ${viewer.lastName}`} 
                        className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                      />
                      <div className="text-left">
                        <p className="text-white font-bold text-sm leading-tight">{viewer.firstName} {viewer.lastName}</p>
                        <p className="text-zinc-500 text-[11px] font-mono mt-0.5">@{viewer.firstName.toLowerCase()}{viewer.lastName?.toLowerCase() || ''}</p>
                      </div>
                    </div>
                    {viewer.isAdmin && (
                      <span className="text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full tracking-widest">
                        Admins
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewerModal;
