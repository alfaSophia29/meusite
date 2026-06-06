
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebaseClient';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Post, User, Page } from '../types';
import VideoPlayer from './VideoPlayer';
import { 
  HeartIcon, 
  ChatBubbleOvalLeftIcon, 
  ShareIcon, 
  MusicalNoteIcon,
  BookmarkIcon as BookmarkSolid 
} from '@heroicons/react/24/solid';
import { 
  HeartIcon as HeartOutline, 
  ChatBubbleOvalLeftIcon as ChatOutline, 
  ShareIcon as ShareOutline,
  ArrowLeftIcon,
  BookmarkIcon as BookmarkOutline,
  XMarkIcon,
  TrashIcon,
  ExclamationCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import { 
  findUserById, 
  toggleFollowUser, 
  getPostById,
  updatePostSaves,
  updatePostShares,
  createReport,
  deletePost,
  incrementShortsView
} from '../services/storageService';
import CommentsModal from './CommentsModal';
import { useDialog } from '../services/DialogContext';

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
        <ReelItem 
          key={reel.id} 
          reel={reel} 
          currentUser={currentUser} 
          onNavigate={onNavigate} 
          onReelDeleted={(deletedId) => setReels(prev => prev.filter(r => r.id !== deletedId))}
        />
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

const ReelItem: React.FC<{ 
  reel: Post; 
  currentUser: User; 
  onNavigate: any; 
  onReelDeleted: (id: string) => void;
}> = ({ reel, currentUser, onNavigate, onReelDeleted }) => {
  const { showAlert, showConfirm, showSuccess, showError } = useDialog();
  const [liked, setLiked] = useState(reel.likes?.includes(currentUser.id) || false);
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [author, setAuthor] = useState<User | null>(null);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(reel.comments?.length || 0);
  
  // Custom interactive states
  const [showOptions, setShowOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [saved, setSaved] = useState(reel.saves?.includes(currentUser.id) || false);
  const [reportingReason, setReportingReason] = useState<string | null>(null);

  const lastTap = useRef(0);

  useEffect(() => {
    setSaved(reel.saves?.includes(currentUser.id) || false);
  }, [reel, currentUser.id]);

  useEffect(() => {
    // Incrementar a contagem real de visualizações do criador do Reel no banco de dados Firestore
    if (reel.userId) {
      incrementShortsView(reel.userId);
    }
  }, [reel.userId, reel.id]);

  const fetchCommentsCount = async () => {
    const freshPost = await getPostById(reel.id);
    if (freshPost) {
      setLocalCommentsCount(freshPost.comments?.length || 0);
    }
  };

  useEffect(() => {
    const fetchAuthor = async () => {
      const user = await findUserById(reel.userId);
      setAuthor(user || null);
    };
    fetchAuthor();
  }, [reel.userId]);

  const getShareUrl = () => {
    return `${window.location.origin}/reels?reelId=${reel.id}`;
  };

  const handleSaveToggle = async () => {
    try {
      await updatePostSaves(reel.id, currentUser.id);
      const newSaved = !saved;
      setSaved(newSaved);
      showSuccess(newSaved ? 'Reel salvo com sucesso!' : 'Reel removido dos salvos!');
    } catch (err) {
      console.error(err);
      showError('Ocorreu um erro ao atualizar os salvos.');
    } finally {
      setShowOptions(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      await updatePostShares(reel.id, currentUser.id);
      showSuccess('Link copiado para a área de transferência!');
    } catch (err) {
      console.error(err);
      showError('Não foi possível copiar o link.');
    } finally {
      setShowOptions(false);
    }
  };

  const handleCopyLinkFromShare = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      await updatePostShares(reel.id, currentUser.id);
      showSuccess('Link copiado para a área de transferência!');
    } catch (err) {
      console.error(err);
      showError('Não foi possível copiar o link.');
    } finally {
      setShowShareOptions(false);
    }
  };

  const handleDeleteClick = () => {
    setShowOptions(false);
    showConfirm(
      'Deseja realmente excluir este Reel permanentemente? Esta ação não pode ser desfeita.',
      async () => {
        try {
          await deletePost(reel.id);
          showSuccess('Reel excluído com sucesso!');
          onReelDeleted(reel.id);
        } catch (err) {
          console.error(err);
          showError('Falha ao excluir o Reel.');
        }
      },
      { title: 'Excluir Reel' }
    );
  };

  const handleSendReport = async (reason: string) => {
    try {
      await createReport({
        postId: reel.id,
        reporterId: currentUser.id,
        reason: reason,
        timestamp: Date.now(),
        type: 'post',
        status: 'PENDING'
      });
      showSuccess('Obrigado! Sua denúncia foi enviada à moderação e este reel será enviado para análise.');
    } catch (err) {
      console.error(err);
      showError('Não foi possível enviar a denúncia no momento.');
    } finally {
      setReportingReason(null);
      setShowOptions(false);
    }
  };

  const handleSocialShare = async (platform: 'whatsapp' | 'telegram' | 'x') => {
    let url = '';
    const shareText = `Confira este Reel incrível no FacePhone: ${getShareUrl()}`;
    const encodedText = encodeURIComponent(shareText);
    
    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    } else if (platform === 'telegram') {
      url = `https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent('Confira este Reel no FacePhone!')}`;
    } else if (platform === 'x') {
      url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    }
    
    try {
      await updatePostShares(reel.id, currentUser.id);
    } catch (e) {
      console.warn(e);
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowShareOptions(false);
  };

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
          <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="p-1">
            <ChatOutline className="h-8 w-8 text-white drop-shadow-md" />
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow-md">{localCommentsCount}</span>
        </div>

        <button onClick={(e) => { e.stopPropagation(); setShowShareOptions(true); }} className="p-1 hover:scale-110 active:scale-95 transition-all text-white/90 hover:text-white">
          <ShareOutline className="h-8 w-8 text-white drop-shadow-md" />
        </button>

        <button onClick={(e) => { e.stopPropagation(); setShowOptions(true); }} className="p-1 hover:scale-110 active:scale-95 transition-all text-white/90 hover:text-white">
          <div className="flex flex-col gap-1 items-center justify-center h-8 w-8">
            <div className="w-[4px] h-[4px] bg-white rounded-full drop-shadow-md"></div>
            <div className="w-[4px] h-[4px] bg-white rounded-full drop-shadow-md"></div>
            <div className="w-[4px] h-[4px] bg-white rounded-full drop-shadow-md"></div>
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

      {showComments && (
        <CommentsModal 
          postId={reel.id} 
          currentUser={currentUser} 
          onClose={() => setShowComments(false)} 
          onCommentsUpdated={fetchCommentsCount}
          postOwnerId={reel.userId}
        />
      )}

      {/* Options Dropdown / Sheet */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowOptions(false); setReportingReason(null); }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            {/* Sheet Body */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="relative bg-[#131724]/95 border-t border-white/10 w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 z-10 text-white shadow-2xl overflow-hidden"
            >
              {/* Handle Bar */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full" />
              </div>

              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-zinc-400">Opções do Reel</h3>
                <button 
                  onClick={() => { setShowOptions(false); setReportingReason(null); }} 
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                {reportingReason === null ? (
                  <>
                    {/* Save option */}
                    <button 
                      onClick={handleSaveToggle}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left"
                    >
                      {saved ? (
                        <BookmarkSolid className="h-6 w-6 text-yellow-500" />
                      ) : (
                        <BookmarkOutline className="h-6 w-6 text-zinc-300" />
                      )}
                      <span className="font-bold text-sm text-zinc-100">
                        {saved ? 'Remover dos itens salvos' : 'Salvar Reel'}
                      </span>
                    </button>

                    {/* Copy URL option */}
                    <button 
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left"
                    >
                      <LinkIcon className="h-6 w-6 text-zinc-300" />
                      <span className="font-bold text-sm text-zinc-100">Copiar Link</span>
                    </button>

                    {/* Report option */}
                    {reel.userId !== currentUser.id && (
                      <button 
                        onClick={() => setReportingReason('selecting')}
                        className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left text-red-400 font-semibold"
                      >
                        <ExclamationCircleIcon className="h-6 w-6 text-red-400" />
                        <span>Denunciar Reel</span>
                      </button>
                    )}

                    {/* Delete option */}
                    {reel.userId === currentUser.id && (
                      <button 
                        onClick={handleDeleteClick}
                        className="w-full flex items-center gap-4 px-5 py-4 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 rounded-2xl transition-all text-left"
                      >
                        <TrashIcon className="h-6 w-6" />
                        <span className="font-black text-sm text-red-500">EXCLUIR REEL</span>
                      </button>
                    )}
                  </>
                ) : (
                  /* Report reasons */
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Por que está denunciando este Reel?</p>
                    <div className="grid grid-cols-1 gap-2 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar">
                      {['Spam / Conteúdo Enganoso', 'Nudez ou Atividade Sexual', 'Discurso de Ódio / Violência', 'Bullying ou Assédio', 'Direitos Autorais', 'Outros'].map((reason) => (
                        <button 
                          key={reason}
                          onClick={() => handleSendReport(reason)}
                          className="w-full text-left px-5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-bold text-zinc-200 transition-colors"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setReportingReason(null)}
                      className="w-full text-center py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black text-zinc-400 uppercase tracking-widest mt-1 transition-colors"
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Bottom Sheet */}
      <AnimatePresence>
        {showShareOptions && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareOptions(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            {/* Sheet Body */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="relative bg-[#131724]/95 border-t border-white/10 w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 z-10 text-white shadow-2xl overflow-hidden"
            >
              {/* Handle Bar */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full" />
              </div>

              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-zinc-400">Compartilhar Reel</h3>
                <button 
                  onClick={() => setShowShareOptions(false)} 
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Social sharing platforms */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {/* Copy Link */}
                <button 
                  onClick={handleCopyLinkFromShare}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 active:scale-95">
                    <LinkIcon className="h-5 w-5 text-zinc-200" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">Copiar Link</span>
                </button>

                {/* WhatsApp */}
                <button 
                  onClick={() => handleSocialShare('whatsapp')}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 active:scale-95">
                    <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.6 1.455 5.4 0 9.8-4.3 9.8-9.7 0-2.6-1-5-2.8-6.9C16.3 2.2 13.9 1.1 11.4 1.1 6 1.1 1.6 5.5 1.6 10.9c0 1.9.5 3.7 1.5 5.3l-1 3.6 3.7-.95zm11-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.1-.3.1-.5 0-.7-.3-1.4-.6-1.9-1.1-.4-.4-.7-.9-.9-1.2-.1-.2 0-.4.1-.5.1-.1.2-.2.3-.3.1-.1.1-.2.2-.3.1-.1 0-.3-.1-.4-.1-.2-.5-1.2-.7-1.7-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.8.8-.8 2s.9 2.4 1 2.6c.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1s-.3-.2-.5-.3z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button 
                  onClick={() => handleSocialShare('telegram')}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 active:scale-95">
                    <svg className="w-5 h-5 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.91 2.212a.75.75 0 00-.773-.105L.893 11.23a.75.75 0 00.047 1.341l4.981 2.115 1.921 5.673a.75.75 0 001.272.247l2.871-2.87 5.17 3.805a.75.75 0 001.171-.433l5.83-20.003a.75.75 0 00-.226-.693zM8.13 15.353l-.116 3.42-1.135-3.351 12.384-8.814-11.133 8.745zm8.131 3.514l-4.144-3.048 9.404-7.404-5.26 10.452z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">Telegram</span>
                </button>

                {/* X / Twitter */}
                <button 
                  onClick={() => handleSocialShare('x')}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 active:scale-95">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">X (Twitter)</span>
                </button>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between text-zinc-300">
                <div className="w-[75%] overflow-hidden truncate mr-2 select-all">
                  <span className="text-[11px] font-mono whitespace-nowrap text-zinc-400">{getShareUrl()}</span>
                </div>
                <button 
                  onClick={handleCopyLinkFromShare}
                  className="px-3 py-1.5 bg-white text-black font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Copiar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelsPage;
