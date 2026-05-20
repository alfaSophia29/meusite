
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebaseClient';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Post, User, Page } from '../types';
import VideoPlayer from './VideoPlayer';
import { HeartIcon, ChatBubbleOvalLeftIcon, ShareIcon, MusicalNoteIcon } from '@heroicons/react/24/solid';
import { 
  HeartIcon as HeartOutline, 
  ChatBubbleOvalLeftIcon as ChatOutline, 
  ShareIcon as ShareOutline,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import { findUserById, toggleFollowUser } from '../services/storageService';

interface ReelsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
  startPostId?: string;
}

const ReelsPage: React.FC<ReelsPageProps> = ({ currentUser, onNavigate }) => {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReels = async () => {
      if (!db) return;
      try {
        const q = query(
          collection(db, 'posts'),
          where('type', '==', 'REEL'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetchedReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        setReels(fetchedReels);
      } catch (error) {
        console.error('Error fetching reels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar relative"
    >
      {/* Absolute Header Overlay */}
      <div className="absolute top-0 left-0 w-full z-50 p-6 flex items-center justify-between pointer-events-none">
          <button 
            onClick={() => onNavigate('feed')}
            className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-black/40 transition-all"
          >
              <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="text-white font-black uppercase tracking-[0.3em] text-[10px] pointer-events-none">
              REELS IA
          </div>
          <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {reels.map((reel) => (
        <ReelItem key={reel.id} reel={reel} currentUser={currentUser} onNavigate={onNavigate} />
      ))}
      
      {reels.length === 0 && (
        <div className="h-screen w-full flex flex-col items-center justify-center text-white text-center px-10">
          <MusicalNoteIcon className="h-20 w-20 text-gray-700 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Nenhum Reel encontrado</h2>
          <p className="text-gray-400 font-medium">Seja o primeiro a publicar um vídeo curto na plataforma!</p>
        </div>
      )}
    </div>
  );
};

const ReelItem: React.FC<{ reel: Post; currentUser: User; onNavigate: any }> = ({ reel, currentUser, onNavigate }) => {
  const [liked, setLiked] = useState(reel.likes?.includes(currentUser.id) || false);
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [author, setAuthor] = useState<User | null>(null);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    const fetchAuthor = async () => {
      const user = await findUserById(reel.userId);
      setAuthor(user || null);
    };
    fetchAuthor();
  }, [reel.userId]);

  const toggleLike = () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser.id || !reel.userId) return;
    await toggleFollowUser(currentUser.id, reel.userId);
    // Para simplificar aqui apenas atualizamos o estado local se necessário
    // mas o App.tsx já tem listeners ou o refreshUser pode ser chamado
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) toggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  const videoUrl = reel.reel?.videoUrl || reel.imageUrl || '';

  return (
    <div className="h-screen w-full snap-start relative bg-black flex items-center justify-center overflow-hidden" onClick={handleDoubleTap}>
      <div className="absolute inset-0 z-0">
        <VideoPlayer 
          src={videoUrl} 
          autoPlay 
          loop 
          isReel
          className="h-full w-full object-cover"
        />
      </div>

      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute z-50 pointer-events-none"
          >
            <HeartIcon className="h-24 w-24 text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none z-10" />

      {/* Right Actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-20">
        <div className="flex flex-col items-center gap-1">
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            className="p-1 group"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={liked ? 'liked' : 'unliked'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                 {liked ? (
                   <HeartIcon className="h-8 w-8 text-red-500 drop-shadow-md" />
                 ) : (
                   <HeartOutline className="h-8 w-8 text-white drop-shadow-md" />
                 )}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          <span className="text-white text-[11px] font-bold drop-shadow-md">{likesCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button onClick={(e) => e.stopPropagation()} className="p-1">
            <ChatOutline className="h-8 w-8 text-white drop-shadow-md" />
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow-md">{reel.comments?.length || 0}</span>
        </div>

        <button onClick={(e) => e.stopPropagation()} className="p-1">
          <ShareOutline className="h-8 w-8 text-white drop-shadow-md" />
        </button>

        <button onClick={(e) => e.stopPropagation()} className="p-1">
          <div className="flex flex-col gap-1 items-center justify-center h-8">
            <div className="w-[3px] h-[3px] bg-white rounded-full"></div>
            <div className="w-[3px] h-[3px] bg-white rounded-full"></div>
            <div className="w-[3px] h-[3px] bg-white rounded-full"></div>
          </div>
        </button>

        <div className="mt-2 text-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-white/20 p-1 bg-black/40 backdrop-blur-sm overflow-hidden mx-auto"
              onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: reel.userId }); }}
            >
                <img src={author?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} alt="" className="w-full h-full object-cover rounded-full" />
            </motion.div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-6 left-4 right-16 z-20">
        <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: reel.userId }); }}>
          <img 
            src={author?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
            alt={author?.firstName} 
            className="h-8 w-8 rounded-full border border-white/50"
          />
          <h4 className="text-white font-bold text-sm drop-shadow-md">{author?.firstName?.toLowerCase() || 'usuario'}</h4>
          {currentUser.id && reel.userId && String(currentUser.id) !== String(reel.userId) && !currentUser.followedUsers?.includes(reel.userId) && (
            <button 
              onClick={handleFollow}
              className="border border-white text-white px-2 py-0.5 rounded-md text-[10px] font-bold hover:bg-white/10 transition-all ml-1"
            >
                Seguir
            </button>
          )}
        </div>
        
        <div className="max-w-[100%] overflow-hidden">
          <p className="text-white text-[13px] font-medium drop-shadow-md line-clamp-2 leading-relaxed mb-3">
            {reel.content}
          </p>
        </div>

        <div className="flex items-center gap-2 text-white/90 text-[11px] font-medium drop-shadow-md max-w-[80%] overflow-hidden">
            <MusicalNoteIcon className="h-3 w-3 shrink-0" />
            <div className="overflow-hidden whitespace-nowrap">
              <motion.span 
                animate={{ x: [0, -100] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                Áudio Original • {author?.firstName} {author?.lastName} • Áudio Original • {author?.firstName} {author?.lastName}
              </motion.span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReelsPage;
