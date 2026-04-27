
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post, User, PostType, AudioTrack, Page } from '../types';
import { 
  getPosts, 
  findUserById, 
  updatePostLikes, 
  updatePostShares, 
  toggleFollowUser, 
  findAudioTrackById, 
  updatePostSaves,
  incrementPostViews,
  incrementShortsView
} from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import {
  ChatBubbleOvalLeftIcon as ChatIconOutline,
  ShareIcon as ShareIconOutline,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  PlayIcon,
  BookmarkIcon as BookmarkIconOutline,
  MusicalNoteIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid';
import CommentsModal from './CommentsModal';
import IndicateModal from './IndicateModal';
import ShareModal from './ShareModal';

interface ReelsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
  startPostId?: string;
}

interface ReelVideoProps {
  post: Post;
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onFollowToggle: (userIdToFollow: string) => void;
  refreshUser: () => void;
  isIntersecting: boolean;
  onPostUpdate: () => void;
  // New props for global state and auto-scroll
  isMuted: boolean;
  onToggleMute: () => void;
  onVideoEnd: () => void;
}

const ReelVideo: React.FC<ReelVideoProps> = ({ 
  post, 
  currentUser, 
  onNavigate, 
  onFollowToggle, 
  refreshUser, 
  isIntersecting, 
  onPostUpdate,
  isMuted,
  onToggleMute,
  onVideoEnd
}) => {
  if (!post || !currentUser) return null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isIndicateModalOpen, setIsIndicateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [likeHearts, setLikeHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [videoProgress, setVideoProgress] = useState(0);
  const [postAuthor, setPostAuthor] = useState<User | null>(null);

  // Optimistic Likes state
  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUser.id) || false);
  const [isSaved, setIsSaved] = useState(post.saves?.includes(currentUser.id) || false);
  const [savesCount, setSavesCount] = useState(post.saves?.length || 0);

  const clickTimeout = useRef<number | null>(null);

  useEffect(() => {
    const fetchAuthor = async () => {
      const u = await findUserById(post.userId);
      setPostAuthor(u || null);
    };
    fetchAuthor();
  }, [post.userId]);

  useEffect(() => {
    setLocalLikes(post.likes || []);
    setIsLiked(post.likes?.includes(currentUser.id) || false);
    setIsSaved(post.saves?.includes(currentUser.id) || false);
    setSavesCount(post.saves?.length || 0);
  }, [post.likes, post.saves, currentUser.id]);

  const isFollowing = currentUser.followedUsers?.includes(post.userId);
  const hasSaved = post.saves?.includes(currentUser.id);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);

  useEffect(() => {
    if (post.reel?.audioTrackId) {
      findAudioTrackById(post.reel.audioTrackId).then(track => {
        setAudioTrack(track || null);
      });
    }
  }, [post.reel?.audioTrackId]);

  // Sync mute state whenever prop changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const syncPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = isMuted; // Ensure muted state is applied before playing
      if (video.paused) await video.play();
    } catch (e) {
      // Auto-play policy might block unmuted playback
      if (!isMuted) {
         // console.warn("Autoplay blocked, falling back to muted");
         // video.muted = true;
         // await video.play();
      }
    }
  }, [isMuted]);
  
  const syncPause = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
  }, []);

  useEffect(() => {
    if (isIntersecting) {
        // Reset progress when scrolling back to a video
        if (videoRef.current) {
            // Optional: reset to 0 if coming back? usually user prefers resume
            // videoRef.current.currentTime = 0; 
        }
        syncPlay();
        // Increment views
        incrementPostViews(post.id);
        
        // Increment Monetization Goals (YouTube Model)
        if (post.userId !== currentUser.id) {
          incrementShortsView(post.userId);
        }
    } else {
        syncPause();
    }
  }, [isIntersecting, syncPlay, syncPause, post.id]);
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      syncPlay();
      setShowPlayIcon(false);
    } else {
      syncPause();
      setShowPlayIcon(true);
    }
  };

  const handleLike = async (e?: any) => {
    if (e) e.stopPropagation();
    
    // Optimistic
    const prevLiked = isLiked;
    const prevLikes = [...localLikes];
    
    setIsLiked(!prevLiked);
    if (prevLiked) {
        setLocalLikes(prev => prev.filter(id => id !== currentUser.id));
    } else {
        setLocalLikes(prev => [...prev, currentUser.id]);
    }

    try {
        await updatePostLikes(post.id, currentUser.id);
        refreshUser();
    } catch (err) {
        setIsLiked(prevLiked);
        setLocalLikes(prevLikes);
    }
  };

  const handleDoubleClick = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    const newHeart = { id: Date.now(), x, y };
    setLikeHearts(prev => [...prev, newHeart]);
    if (!isLiked) handleLike();
    setTimeout(() => setLikeHearts(prev => prev.filter(h => h.id !== newHeart.id)), 800);
  };

  const handleMainContainerClick = (e: React.MouseEvent) => {
    if (clickTimeout.current) {
      window.clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      handleDoubleClick(e);
    } else {
      clickTimeout.current = window.setTimeout(() => {
        togglePlayPause();
        clickTimeout.current = null;
      }, 250);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistic
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);
    setSavesCount(prev => prevSaved ? prev - 1 : prev + 1);
    
    try {
      await updatePostSaves(post.id, currentUser.id);
      onPostUpdate();
    } catch (err) {
      setIsSaved(prevSaved);
      setSavesCount(prev => prevSaved ? prev + 1 : prev - 1);
    }
  };

  if (!postAuthor || !post.reel) return null;

  return (
    <div 
      className="relative w-full h-full snap-start snap-always overflow-hidden bg-black flex items-center justify-center"
      onClick={handleMainContainerClick}
    >
      {/* 1. LAYER: VIDEO */}
      <video
        ref={videoRef}
        src={post.reel.videoUrl}
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={onVideoEnd} // Trigger scroll to next
        className="w-full h-full object-cover md:max-w-lg md:mx-auto"
        style={{ filter: post.reel.filter || 'none' }}
      />
      
      {/* 2. LAYER: OVERLAYS */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-10"></div>
      
      {/* 3. LAYER: INTERACTIVE ELEMENTS */}

      {/* Play Icon Feedback */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-black/20 p-8 rounded-full backdrop-blur-md animate-scale-in">
            <PlayIcon className="h-16 w-16 text-white/80" />
          </div>
        </div>
      )}

      {/* Double Tap Hearts */}
      {likeHearts.map(heart => (
        <div key={heart.id} className="absolute z-50 pointer-events-none animate-like-heart" style={{ left: heart.x - 40, top: heart.y - 40 }}>
          <HeartIconSolid className="w-24 h-24 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
        </div>
      ))}

      {/* ACTIONS SIDEBAR (Right) - Otimizado para caber em telas menores */}
      <div 
        className="absolute bottom-20 right-1 flex flex-col items-center gap-1.5 z-40 px-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seguir */}
        {!isFollowing && currentUser.id !== post.userId && (
          <button 
            onClick={(e) => { e.stopPropagation(); onFollowToggle(post.userId); }} 
            className="flex flex-col items-center group p-1"
          >
            <div className="bg-blue-600 p-2 rounded-full shadow-2xl border border-white/20 group-active:scale-125 transition-transform">
              <UserPlusIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-[8px] font-black text-white uppercase mt-0.5 drop-shadow-md">Seguir</span>
          </button>
        )}

        {/* Volume */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }} 
          className="flex flex-col items-center group p-1"
        >
          <div className="bg-black/40 backdrop-blur-md p-2 rounded-full shadow-2xl border border-white/10 group-active:scale-125 transition-transform">
            {isMuted ? (
              <SpeakerXMarkIcon className="h-6 w-6 text-white" />
            ) : (
              <SpeakerWaveIcon className="h-6 w-6 text-white" />
            )}
          </div>
          <span className="text-[8px] font-black text-white uppercase mt-0.5 drop-shadow-md">Som</span>
        </button>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center group p-1">
          <div className="transition-transform duration-200 group-active:scale-150">
            <HeartIconSolid className={`h-8 w-8 drop-shadow-xl ${isLiked ? 'text-red-500' : 'text-white'}`} />
          </div>
          <span className="text-[10px] font-black text-white mt-0.5 drop-shadow-md">{localLikes.length}</span>
        </button>

        {/* Comments */}
        <button onClick={(e) => { e.stopPropagation(); setIsCommentsModalOpen(true); }} className="flex flex-col items-center group p-1">
          <ChatIconOutline className="h-8 w-8 text-white drop-shadow-xl group-active:scale-125 transition-transform" />
          <span className="text-[10px] font-black text-white mt-0.5 drop-shadow-md">{post.comments?.length || 0}</span>
        </button>

        {/* Save */}
        <button onClick={handleSave} className="flex flex-col items-center group p-1">
          <BookmarkIconSolid className={`h-8 w-8 drop-shadow-xl transition-all duration-300 group-active:scale-125 ${isSaved ? 'text-yellow-400' : 'text-white'}`} />
          <span className="text-[10px] font-black text-white mt-0.5 drop-shadow-md">{savesCount}</span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="flex flex-col items-center group p-1">
          <ShareIconOutline className="h-8 w-8 text-white drop-shadow-xl group-active:scale-125 transition-transform" />
          <span className="text-[10px] font-black text-white mt-0.5 drop-shadow-md">{post.shares?.length || 0}</span>
        </button>

        {/* Spinning Audio Icon */}
        <div className="mt-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-800 to-black border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl animate-spin-slow">
            <img src={postAuthor.profilePicture || DEFAULT_PROFILE_PIC} className="w-full h-full object-cover opacity-60" />
          </div>
        </div>
      </div>

      {/* INFO AREA (Bottom Left) */}
      <div 
        className="absolute bottom-4 left-0 right-20 z-30 px-5 pb-4 pointer-events-none flex flex-col gap-1.5"
      >
        <div 
          className="flex items-center gap-2 pointer-events-auto cursor-pointer w-fit"
          onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: post.userId }); }}
        >
          <span className="font-black text-base text-white hover:underline drop-shadow-lg">@{post.authorName}</span>
          <span className="bg-blue-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-white uppercase border border-white/10">Mestre</span>
        </div>
        
        <div className="pointer-events-auto max-w-full">
           <p className="text-xs text-white/95 font-medium leading-snug drop-shadow-md line-clamp-2">
            {post.reel.description}
           </p>
        </div>

        <div className="flex items-center gap-2 mt-1 pointer-events-auto w-fit bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
          <MusicalNoteIcon className="h-3 w-3 text-white animate-pulse" />
          <div className="overflow-hidden max-w-[120px]">
            <div className="whitespace-nowrap text-[9px] font-black text-white uppercase tracking-wider animate-marquee">
              {audioTrack ? `${audioTrack.title} - ${audioTrack.artist}` : `Áudio Original • ${post.authorName}`}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (Bottom) */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-50 pointer-events-none">
        <div 
          className="h-full bg-blue-600 transition-all duration-100 ease-linear shadow-[0_0_10px_#2563eb]" 
          style={{ width: `${videoProgress}%` }}
        />
      </div>

      {/* MODALS */}
      {isCommentsModalOpen && (
        <CommentsModal postId={post.id} currentUser={currentUser} onClose={() => setIsCommentsModalOpen(false)} onCommentsUpdated={onPostUpdate} />
      )}

      {isIndicateModalOpen && (
        <IndicateModal post={post} currentUser={currentUser} onClose={() => setIsIndicateModalOpen(false)} onPostUpdated={onPostUpdate} />
      )}

      {isShareModalOpen && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)}
          currentUser={currentUser}
          onNavigate={onNavigate}
          content={{
            title: `Reel de ${post.authorName}`,
            text: post.reel.description || '',
            url: `${window.location.origin}/?page=reels-page&startPostId=${post.id}`,
            mediaUrl: post.reel.videoUrl,
            mediaType: 'video'
          }}
        />
      )}

      <style>{`
        .animate-spin-slow { animation: spin 5s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 8s linear infinite;
        }

        @keyframes like-heart {
          0% { transform: scale(0); opacity: 0; }
          20% { transform: scale(1.2) rotate(15deg); opacity: 1; }
          80% { transform: scale(1) rotate(-10deg); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .animate-like-heart { animation: like-heart 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
};

const ReelsPage: React.FC<ReelsPageProps> = ({ currentUser, onNavigate, refreshUser, startPostId }) => {
  const [reels, setReels] = useState<Post[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Global mute state

  const fetchReels = useCallback(async () => {
    const allPosts = await getPosts(currentUser.id);
    const myFollows = currentUser.followedUsers || [];
    
    // Filtrar por seguidores (ou próprio) e ordenar por visualizações (Trending)
    const myBlocked = currentUser.blockedUserIds || [];
    const posts = allPosts
      .filter(p => p.type === PostType.REEL && !myBlocked.includes(p.userId) && (p.userId === currentUser.id || myFollows.includes(p.userId) || p.isBoosted))
      .sort((a, b) => (b.views || 0) - (a.views || 0));
      
    setReels(posts);
    
    // Se houver um post inicial, encontrar o índice
    if (startPostId) {
      const idx = posts.findIndex(p => p.id === startPostId);
      if (idx !== -1) {
        setVisibleIdx(idx);
        // Pequeno delay para garantir que o DOM renderizou
        setTimeout(() => {
          if (containerRef.current?.children[idx]) {
            containerRef.current.children[idx].scrollIntoView();
          }
        }, 100);
      }
    }
    setLoading(false);
  }, [startPostId]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          setVisibleIdx(idx);
        }
      });
    }, { threshold: 0.65 });

    const items = containerRef.current?.children;
    if (items) {
      Array.from(items).forEach(item => {
        if ((item as HTMLElement).dataset.idx !== undefined) {
          observer.observe(item as Element);
        }
      });
    }
    return () => observer.disconnect();
  }, [reels]);

  const handleFollowToggle = useCallback(
    (userIdToFollow: string) => {
      toggleFollowUser(currentUser.id, userIdToFollow);
      refreshUser();
      fetchReels();
    },
    [currentUser.id, refreshUser, fetchReels],
  );

  const handleNextReel = (currentIndex: number) => {
    if (containerRef.current) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < reels.length) {
            // Scroll to next
            const nextElement = containerRef.current.children[nextIndex];
            nextElement?.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Optional: Loop back to start or do nothing
            // containerRef.current.children[0].scrollIntoView({ behavior: 'smooth' });
        }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black text-white text-xl">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        Carregando Reels...
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 md:top-[72px] md:ml-64 bottom-[64px] md:bottom-0 bg-black z-10"
    >
      <div 
        ref={containerRef} 
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.length > 0 ? (
          reels.map((r, i) => (
            <div 
              key={r.id} 
              data-idx={i} 
              className="h-full w-full snap-start snap-always"
            >
              <ReelVideo 
                post={r} 
                currentUser={currentUser} 
                onNavigate={onNavigate} 
                onFollowToggle={handleFollowToggle} 
                refreshUser={refreshUser} 
                isIntersecting={i === visibleIdx}
                onPostUpdate={fetchReels}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted(!isMuted)}
                onVideoEnd={() => handleNextReel(i)}
              />
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white p-10 text-center">
            <MusicalNoteIcon className="h-20 w-20 text-gray-800 mb-6" />
            <h3 className="text-2xl font-black uppercase tracking-tighter">Nenhum Reel ainda</h3>
            <p className="text-gray-500 mt-2 font-medium">Seja o primeiro mestre a publicar conteúdo vertical!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelsPage;
