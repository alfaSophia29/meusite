
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Post, PostType, User, Page } from '../types';
import { DEFAULT_PROFILE_PIC, ANONYMOUS_MASK_PIC } from '../data/constants';
import { 
  findUserById, 
  updatePostLikes, 
  updatePostSaves, 
  unpinPost, 
  pinPost,
  createReport,
  updatePostShares,
  deletePost,
  incrementWatchTime,
  isUserOnline,
  updatePost,
  addPostComment,
  updateUser,
  generateUUID
} from '../services/storageService';
import { translateText } from '../services/translationService';
import { useTranslation } from 'react-i18next';
import {
  HeartIcon as HeartIconOutline, 
  ChatBubbleOvalLeftIcon as ChatIconOutline, 
  BookmarkIcon as BookmarkIconOutline, 
  EllipsisHorizontalIcon, 
  MapPinIcon as PinIconOutline,
  SignalIcon,
  ShareIcon,
  PlayIcon,
  UserGroupIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  LockClosedIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  MapPinIcon as PinIconSolid,
  BoltIcon,
  VideoCameraIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import { translateText as translateAI } from '../services/translationService';
import { motion, AnimatePresence } from 'motion/react';
import PostDetailModal from './PostDetailModal';
import BoostPostModal from './BoostPostModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditPostModal from './EditPostModal';
import PostActionsModal from './PostActionsModal';
import IndicateModal from './IndicateModal';
import ShareModal from './ShareModal';
import VideoPlayer from './VideoPlayer';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onFollowToggle: (userIdToFollow: string) => void;
  refreshUser: () => void;
  onPostUpdatedOrDeleted: () => void;
  onPinToggle: (postId: string, isCurrentlyPinned: boolean) => void;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  currentUser, 
  onNavigate, 
  onFollowToggle,
  refreshUser, 
  onPostUpdatedOrDeleted,
}) => {
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm, showSuccess } = useDialog();
  const [postAuthor, setPostAuthor] = useState<User | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIndicateModal, setShowIndicateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuperModal, setShowSuperModal] = useState(false);

  // States and handler for Super Chats
  const [submittingSuper, setSubmittingSuper] = useState(false);
  const [superAmount, setSuperAmount] = useState(500);
  const [superMessage, setSuperMessage] = useState('');

  const handleSendSuper = async () => {
    if (!postAuthor) return;
    if (currentUser.id === post.userId) {
      showAlert("Não podes apoiar a tua própria publicação!", { type: 'error' });
      return;
    }
    const minAmount = postAuthor.monetizationFeatures?.supersMinAmount || 100;
    if (superAmount < minAmount) {
      showAlert(`O valor mínimo para Super Chat é de ${minAmount} AOA.`, { type: 'error' });
      return;
    }
    if ((currentUser.balance || 0) < superAmount) {
      showAlert("Saldo insuficiente na carteira do FacePhone. Por favor, adicione fundos na sua carteira.", { type: 'error' });
      return;
    }

    setSubmittingSuper(true);
    try {
      // 1. Deduct balance from currentUser
      const updatedCurrentUser: User = {
        ...currentUser,
        balance: (currentUser.balance || 0) - superAmount
      };

      // 2. Add balance to postAuthor (creator)
      const updatedAuthor: User = {
        ...postAuthor,
        balance: (postAuthor.balance || 0) + superAmount
      };

      // 3. Persist private user accounts in Firestore
      await updateUser(updatedCurrentUser);
      await updateUser(updatedAuthor);

      // 4. Create highlighted Comment and persist in post comments
      const commentId = generateUUID();
      const newComment = {
        id: commentId,
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        profilePic: currentUser.profilePicture,
        text: superMessage.trim() || `Enviou um Super Chat de ${superAmount} AOA! 🌟`,
        timestamp: Date.now(),
        isSuperChat: true,
        superChatAmount: superAmount
      };

      await addPostComment(post.id, newComment);

      // 5. Update local states
      showSuccess(`Apoio de ${superAmount} AOA enviado com sucesso para ${postAuthor.firstName}! 🎉`);
      setSuperMessage('');
      setSuperAmount(500);
      setShowSuperModal(false);
      refreshUser();
      onPostUpdatedOrDeleted();
    } catch (err) {
      console.error("Erro ao enviar Super Chat:", err);
      showAlert("Erro ao processar o seu Super Chat. Tente novamente.", { type: 'error' });
    } finally {
      setSubmittingSuper(false);
    }
  };

  // Optimistic UI states
  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUser.id) || false);
  const [localSaves, setLocalSaves] = useState<string[]>(post.saves || []);
  const [isSaved, setIsSaved] = useState(post.saves?.includes(currentUser.id) || false);
  const [localFollowing, setLocalFollowing] = useState(currentUser.followedUsers?.includes(post.userId));
  
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const isRecordedLive = post.type === PostType.LIVE && post.liveStream?.status === 'ENDED' && post.liveStream.recordingUrl;
  const isFollowing = localFollowing;

  const isAnonymous = post.isAnonymous;
  const authorDisplayName = isAnonymous ? t('anonymous_user') : `${postAuthor?.firstName || ''} ${postAuthor?.lastName || ''}`;
  const authorDisplayPic = isAnonymous ? ANONYMOUS_MASK_PIC : (postAuthor?.profilePicture || DEFAULT_PROFILE_PIC);
  const isActuallyOnline = !isAnonymous && isUserOnline(postAuthor?.lastSeen, postAuthor?.isOnline);

  // Gera um delay aleatório para a animação de flutuação, para que os cards não se movam em uníssono.
  const animationDelay = useMemo(() => `${Math.random() * 5}s`, []);

  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const TEXT_LIMIT = 280;

  useEffect(() => {
    setLocalLikes(post.likes || []);
    setIsLiked(post.likes?.includes(currentUser.id) || false);
    setLocalSaves(post.saves || []);
    setIsSaved(post.saves?.includes(currentUser.id) || false);
    setLocalFollowing(currentUser.followedUsers?.includes(post.userId));
  }, [post.likes, post.saves, currentUser.id, currentUser.followedUsers, post.userId]);

  useEffect(() => {
    const fetchAuthor = async () => {
      const author = await findUserById(post.userId);
      setPostAuthor(author || null);
    };
    fetchAuthor();
  }, [post.userId]);

  // Monetization Watch Time Tracking
  const [isPlaying, setIsPlaying] = useState(false);
  const watchStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (isPlaying && currentUser && currentUser.id !== 'anonymous' && currentUser.id !== 'guest') {
      watchStartTimeRef.current = Date.now();
    } else {
      if (watchStartTimeRef.current) {
        const elapsedSeconds = (Date.now() - watchStartTimeRef.current) / 1000;
        if (elapsedSeconds > 2 && post.userId !== currentUser.id) {
          incrementWatchTime(post.userId, elapsedSeconds, currentUser.isPremium);
        }
        watchStartTimeRef.current = null;
      }
    }
    
    return () => {
      if (watchStartTimeRef.current) {
        const elapsedSeconds = (Date.now() - watchStartTimeRef.current) / 1000;
        if (elapsedSeconds > 2 && post.userId !== currentUser.id) {
          incrementWatchTime(post.userId, elapsedSeconds, currentUser.isPremium);
        }
      }
    };
  }, [isPlaying, post.userId, currentUser.id, currentUser.isPremium]);

  // Video Player Sync
  const [videoStats, setVideoStats] = useState({ currentTime: 0, isPlaying: false });

  const handleVideoPlayChange = React.useCallback((playing: boolean) => {
    setIsPlaying(playing);
    setVideoStats(v => v.isPlaying === playing ? v : ({ ...v, isPlaying: playing }));
  }, []);

  const handleVideoTimeUpdate = React.useCallback((time: number) => {
    setVideoStats(v => v.currentTime === time ? v : ({ ...v, currentTime: time }));
  }, []);

  const hasBg = post?.backgroundColor && post.backgroundColor !== 'transparent' && post.backgroundColor !== 'bg-transparent';
  
  const displayContent = useMemo(() => {
    if (!post?.content) return '';
    const limit = hasBg ? 500 : TEXT_LIMIT;
    if (isTextExpanded || post.content.length <= limit) return post.content;
    return post.content.substring(0, limit) + '...';
  }, [post?.content, isTextExpanded, hasBg]);

  useEffect(() => {
    return () => {
      if (isReadingVoice) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isReadingVoice]);

  if (!post || !currentUser || !post.id) return null;

  const isAuthor = currentUser.id === post.userId;
  const isPostBoosted = post.isBoosted && post.boostExpires && post.boostExpires > Date.now();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistic Update
    const prevIsLiked = isLiked;
    const prevLikes = [...localLikes];
    
    setIsLiked(!prevIsLiked);
    if (prevIsLiked) {
      setLocalLikes(prev => prev.filter(id => id !== currentUser.id));
    } else {
      setLocalLikes(prev => [...prev, currentUser.id]);
    }

    if (!isLiked) {
       setShowHeartBurst(true);
       setTimeout(() => setShowHeartBurst(false), 1000);
    }

    try {
      await updatePostLikes(post.id, currentUser.id);
    } catch (error) {
      setIsLiked(prevIsLiked);
      setLocalLikes(prevLikes);
      console.error("Falha ao curtir post", error);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistic Update
    const prevIsSaved = isSaved;
    const prevSaves = [...localSaves];

    setIsSaved(!prevIsSaved);
    if (prevIsSaved) {
      setLocalSaves(prev => prev.filter(id => id !== currentUser.id));
    } else {
      setLocalSaves(prev => [...prev, currentUser.id]);
    }

    try {
      await updatePostSaves(post.id, currentUser.id);
    } catch (error) {
      setIsSaved(prevIsSaved);
      setLocalSaves(prevSaves);
    }
  };

  const handleFollowInternal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalFollowing(!localFollowing);
    onFollowToggle(post.userId);
  };

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedContent) {
        setTranslatedContent(null);
        return;
    }
    
    setIsTranslating(true);
    try {
        const langMap: Record<string, string> = {
            'pt': 'Português',
            'en': 'English',
            'es': 'Español'
        };
        const targetLang = langMap[i18n.language.split('-')[0]] || 'Português';
        const translated = await translateText(post.content || '', targetLang);
        setTranslatedContent(translated);
    } catch (error) {
        showAlert(t('translation_error') || "Erro ao traduzir texto.");
    } finally {
        setIsTranslating(false);
    }
  };

  const handleReadAloud = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadingVoice) {
      window.speechSynthesis.cancel();
      setIsReadingVoice(false);
      return;
    }

    const textToRead = translatedContent || post.content;
    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Detect language
    const currentLang = i18n.language.split('-')[0];
    if (currentLang === 'pt') utterance.lang = 'pt-BR';
    else if (currentLang === 'en') utterance.lang = 'en-US';
    else if (currentLang === 'es') utterance.lang = 'es-ES';

    utterance.onend = () => setIsReadingVoice(false);
    utterance.onerror = () => setIsReadingVoice(false);

    setIsReadingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  const contentLength = post.content?.length || 0;

  // Lógica Adaptativa de Tamanho (Otimizada para Mobile)
  let fontSizeClass = 'text-[15px] md:text-[17px]';

  if (hasBg) {
    const effectiveTextColor = post.textColor && post.textColor !== 'text-white' 
      ? post.textColor 
      : (post.backgroundColor === 'bg-white' ? 'text-gray-900' : 'text-white');

    if (contentLength < 60) {
        fontSizeClass = `${effectiveTextColor} text-2xl md:text-4xl leading-tight`;
    } else if (contentLength < 150) {
        fontSizeClass = `${effectiveTextColor} text-lg md:text-2xl leading-snug`;
    } else {
        fontSizeClass = `${effectiveTextColor} text-base md:text-xl leading-relaxed`;
    }
  }

  return (
    <>
      {showHeartBurst && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute"
            >
              <HeartIconSolid className="h-12 w-12 text-red-500 drop-shadow-2xl" />
            </div>
          ))}
        </div>
      )}

      <div 
        onClick={() => {
          if (post.type === PostType.LIVE && post.liveStream?.status !== 'ENDED') onNavigate('live', { postId: post.id });
          else if (post.type === PostType.REEL) onNavigate('reels-page', { startPostId: post.id });
          else if (!isRecordedLive) setShowDetailModal(true);
        }}
        className="bg-white dark:bg-darkcard md:rounded-[1.5rem] border border-gray-100 dark:border-white/5 w-full relative cursor-pointer group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors duration-200 shadow-sm md:shadow-md"
      >
        <div className="p-4 flex flex-col">
          {/* Top Header: Avatar & Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`relative group/avatar shrink-0 ${isAnonymous ? 'cursor-default' : 'cursor-pointer'}`} onClick={(e) => { e.stopPropagation(); if(!isAnonymous) onNavigate('profile', { userId: post.userId }); }}>
                <img 
                  src={authorDisplayPic} 
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white dark:border-[#000000] shadow-md transition-transform group-hover/avatar:scale-105" 
                  referrerPolicy="no-referrer"
                />
                {isActuallyOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white dark:border-[#000000] shadow-sm"></div>
                )}
              </div>

              {/* User Info */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`font-black text-base md:text-lg text-gray-900 dark:text-white truncate ${isAnonymous ? '' : 'hover:underline cursor-pointer'}`} onClick={(e) => { e.stopPropagation(); if(!isAnonymous) onNavigate('profile', { userId: post.userId }); }}>
                    {authorDisplayName}
                  </span>
                  {!isAnonymous && postAuthor?.isVerified && <BoltIcon className="h-4 w-4 text-brand shrink-0" />}
                  {!isAnonymous && !isAuthor && !isFollowing && (
                    <button 
                      onClick={handleFollowInternal}
                      className="ml-2 text-[10px] font-black uppercase text-brand bg-brand/10 hover:bg-brand hover:text-white px-2.5 py-1 rounded-lg transition-all"
                    >
                      {t('follow')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                  {post.isPinned && (
                    <>
                      <span>·</span>
                      <PinIconSolid className="h-3 w-3" />
                    </>
                  )}
                  {isPostBoosted && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                        <BoltIcon className="h-3 w-3" />
                        <span>Patrocinado</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Menu */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowActionsModal(true); }} 
              className="p-2.5 rounded-2xl text-gray-500 hover:text-brand hover:bg-brand/10 transition-all bg-gray-50 dark:bg-white/5"
            >
              <EllipsisHorizontalIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Main Content Area (Full Width) */}
          <div className="w-full">
            {/* Post Breadcrumb (Groups) */}
            {post.groupId && (
              <div className="flex items-center gap-1 text-[12px] text-brand font-black uppercase tracking-widest mb-3 px-1">
                <UserGroupIcon className="h-3.5 w-3.5" /> <span>em {post.groupName}</span>
              </div>
            )}

            {/* Main Content Body */}
            <div className="mt-1">
              {post.content && (
                <div 
                  className={`w-full transition-all duration-300 relative group/content
                    ${hasBg ? `${post.backgroundColor} ${post.textColor || 'text-white'} rounded-2xl p-6 text-center my-2 shadow-inner` : 'text-left bg-transparent'} 
                    ${post.fontFamily || 'font-sans'}`}
                >
                  <p 
                    style={{ fontFamily: `var(--${post.fontFamily || 'font-sans'})` }}
                    className={`whitespace-pre-wrap break-words w-full transition-all duration-300 ${hasBg ? fontSizeClass : 'text-[15px] md:text-[17px] leading-relaxed tracking-tight text-gray-900 dark:text-gray-100 font-medium'}`}
                  >
                    {translatedContent || displayContent}
                  </p>
                  
                  {post.content && post.content.length > 3 && (
                     <div className="flex items-center gap-4">
                        <button 
                            onClick={handleTranslate}
                            className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${hasBg ? 'text-white/80 hover:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            {isTranslating ? (
                                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                            ) : (
                                <span>{translatedContent ? t('view_original') : t('translate')}</span>
                            )}
                        </button>

                        <button 
                            onClick={handleReadAloud}
                            className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${hasBg ? 'text-white/80 hover:text-white' : (isReadingVoice ? 'text-brand' : 'text-gray-500 dark:text-gray-400')}`}
                        >
                            {isReadingVoice ? (
                                <><div className="flex gap-0.5"><div className="w-0.5 h-2 bg-current animate-bounce" style={{animationDelay: '0s'}}></div><div className="w-0.5 h-2 bg-current animate-bounce" style={{animationDelay: '0.1s'}}></div><div className="w-0.5 h-2 bg-current animate-bounce" style={{animationDelay: '0.2s'}}></div></div> {t('stop_reading')}</>
                            ) : (
                                <><SpeakerWaveIcon className="h-3.5 w-3.5" /> {t('read_aloud')}</>
                            )}
                        </button>
                     </div>
                  )}
                  {!isTextExpanded && post.content && post.content.length > (hasBg ? 500 : TEXT_LIMIT) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsTextExpanded(true); }}
                      className={`${hasBg ? 'text-white/90 underline-offset-4' : 'text-brand'} hover:underline mt-1 inline-block text-[15px] font-bold`}
                    >
                      {t('show_more') || 'Mostrar mais'}
                    </button>
                  )}
                  {isTextExpanded && post.content && post.content.length > (hasBg ? 500 : TEXT_LIMIT) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsTextExpanded(false); }}
                      className={`${hasBg ? 'text-white/90 underline-offset-4' : 'text-brand'} hover:underline mt-2 block text-[15px] font-bold mx-auto md:mx-0`}
                    >
                      {t('show_less') || 'Mostrar menos'}
                    </button>
                  )}
                </div>
              )}

              {/* Media Blocks */}
              <div className="mt-3">
                {/* LIVE ATIVA */}
                {post.type === PostType.LIVE && !post.liveStream?.recordingUrl && post.liveStream ? (
                   <div className="rounded-2xl overflow-hidden bg-gray-900 text-white p-6 relative border border-white/10">
                      <div className="absolute top-3 left-3 z-10">
                         <div className="bg-red-600 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                            <SignalIcon className="h-3 w-3" /> AO VIVO
                         </div>
                      </div>
                      <div className="relative z-10 py-4 flex flex-col items-center text-center">
                         <h3 className="text-lg font-bold mb-4">{post.liveStream.title}</h3>
                         <button className="bg-brand text-white px-6 py-2 rounded-full font-bold text-sm">
                            Assistir agora
                         </button>
                      </div>
                   </div>
                ) : 
                
                /* LIVE GRAVADA */
                isRecordedLive ? (
                   <VideoPlayer 
                     src={post.liveStream!.recordingUrl!} 
                     className="rounded-2xl shadow-xl aspect-video"
                     autoPlay={true}
                     onPlayChange={handleVideoPlayChange}
                     onTimeUpdate={handleVideoTimeUpdate}
                   />
                ) :
                
                /* REEL */
                post.type === PostType.REEL && post.reel ? (
                  <div className="relative group/player rounded-3xl overflow-hidden shadow-2xl bg-black">
                    <VideoPlayer 
                      src={post.reel.videoUrl} 
                      poster={post.reel.coverImageUrl}
                      className="aspect-[9/16] max-h-[700px] w-full object-cover"
                      isReel={true}
                      loop={true}
                      autoPlay={true}
                      onPlayChange={handleVideoPlayChange}
                      onTimeUpdate={handleVideoTimeUpdate}
                    />
                    
                    {/* IG-STYLE OVERLAY: Right Side Actions */}
                    <div className="absolute right-3 bottom-0 top-0 flex flex-col justify-end items-center gap-6 pb-6 pr-1 z-30 pointer-events-none">
                      <div className="flex flex-col items-center gap-1 pointer-events-auto">
                        <button onClick={handleLike} className={`p-2.5 rounded-full transition-all backdrop-blur-md active:scale-75 ${isLiked ? 'bg-pink-600/30 text-pink-500' : 'bg-black/30 text-white hover:bg-black/40'}`}>
                           {isLiked ? <HeartIconSolid className="h-7 w-7" /> : <HeartIconOutline className="h-7 w-7" />}
                        </button>
                        <span className="text-[11px] font-black text-white drop-shadow-lg">{localLikes.length}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1 pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }} className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/40 transition-all active:scale-75">
                           <ChatIconOutline className="h-7 w-7" />
                        </button>
                        <span className="text-[11px] font-black text-white drop-shadow-lg">{post.comments?.length || 0}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1 pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/40 transition-all active:scale-75">
                           <ShareIcon className="h-7 w-7" />
                        </button>
                        <span className="text-[11px] font-black text-white drop-shadow-lg">{post.shares?.length || 0}</span>
                      </div>

                      <div className="pointer-events-auto">
                        <button onClick={handleSave} className={`p-2.5 rounded-full backdrop-blur-md transition-all active:scale-75 ${isSaved ? 'bg-brand/30 text-brand' : 'bg-black/30 text-white hover:bg-black/40'}`}>
                           {isSaved ? <BookmarkIconSolid className="h-7 w-7" /> : <BookmarkIconOutline className="h-7 w-7" />}
                        </button>
                      </div>

                      <div className="pointer-events-auto pt-2">
                        <button onClick={(e) => { e.stopPropagation(); setShowActionsModal(true); }} className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/40 transition-all active:scale-75">
                           <EllipsisHorizontalIcon className="h-7 w-7" />
                        </button>
                      </div>
                    </div>

                    {/* IG-STYLE OVERLAY: Bottom Info */}
                    <div className="absolute left-0 right-16 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none">
                      <div className={`flex items-center gap-3 mb-4 pointer-events-auto ${isAnonymous ? 'cursor-default' : 'cursor-pointer'}`} onClick={(e) => { e.stopPropagation(); if (!isAnonymous) onNavigate('profile', { userId: post.userId }); }}>
                        <img src={authorDisplayPic} className="h-10 w-10 rounded-full border-2 border-white/40 shadow-xl" />
                        <span className="text-white font-black text-[15px] drop-shadow-md">
                          {authorDisplayName}
                        </span>
                        {!isAuthor && !isFollowing && (
                          <button onClick={handleFollowInternal} className="border-2 border-white/40 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black text-white hover:bg-white/20 transition-all">SEGUIR</button>
                        )}
                      </div>
                      
                      {post.content && (
                        <div className="pointer-events-auto">
                          <p className={`text-white text-[14px] leading-relaxed line-clamp-2 drop-shadow-md font-medium ${post.fontFamily || ''}`}>
                            {post.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : 
                
                /* NORMAL VIDEO */
                post.type === PostType.VIDEO && post.reel ? (
                   <VideoPlayer 
                     src={post.reel.videoUrl} 
                     poster={post.reel.coverImageUrl}
                     className="rounded-2xl shadow-xl aspect-video w-full bg-black"
                     isReel={false}
                     autoPlay={true}
                     onPlayChange={handleVideoPlayChange}
                     onTimeUpdate={handleVideoTimeUpdate}
                   />
                ) : (
                  /* IMAGE OR OTHER */
                  post.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 relative">
                       <img src={post.imageUrl} className="w-full h-auto object-cover max-h-[512px]" alt="Post" />
                    </div>
                  )
                )}
              </div>
            </div>
                 {/* Actions Bar (X Style) - HIDDEN for Reels as it uses IG-style overlay */}
            {post.type !== PostType.REEL && (
              <div className="mt-5 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between max-w-sm text-gray-500">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }}
                  className="flex items-center gap-1 group"
                >
                    <div className="p-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <ChatIconOutline className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-[13px] group-hover:text-brand">{post.comments?.length || 0}</span>
                </button>

                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-1 group transition-all ${isLiked ? 'text-pink-600' : ''}`}
                >
                    <motion.div 
                      whileTap={{ scale: 0.7 }}
                      className={`p-2 rounded-full ${isLiked ? 'group-hover:bg-pink-600/10' : 'group-hover:bg-pink-600/10 group-hover:text-pink-600'} transition-colors`}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isLiked ? 'liked' : 'unliked'}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <motion.div animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                            {isLiked ? <HeartIconSolid className="h-[18px] w-[18px]" /> : <HeartIconOutline className="h-[18px] w-[18px]" />}
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                    <span className={`text-[13px] ${isLiked ? '' : 'group-hover:text-pink-600'}`}>{localLikes.length}</span>
                </button>

                <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowShareModal(true);
                    }}
                    className="flex items-center gap-1 group"
                >
                    <div className="p-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <ShareIcon className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-[13px] group-hover:text-brand">{post.shares?.length || 0}</span>
                </button>

                <button 
                  onClick={handleSave}
                  className={`flex items-center gap-1 group transition-all ${isSaved ? 'text-brand' : ''}`}
                >
                    <div className={`p-2 rounded-full ${isSaved ? 'group-hover:bg-brand/10' : 'group-hover:bg-brand/10 group-hover:text-brand'} transition-colors`}>
                      {isSaved ? <BookmarkIconSolid className="h-[18px] w-[18px]" /> : <BookmarkIconOutline className="h-[18px] w-[18px]" />}
                    </div>
                </button>

                {!isAuthor && postAuthor && (postAuthor.isMonetized || postAuthor.monetizationFeatures?.supersEnabled || postAuthor.userType === 'CREATOR') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSuperModal(true);
                    }}
                    className="flex items-center gap-1 group text-amber-500 hover:text-amber-600 transition-colors"
                    title="Apoiar com Super Chat"
                  >
                    <div className="p-2 rounded-full group-hover:bg-amber-500/10 transition-colors">
                      <BoltIcon className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-[13px] hidden md:inline font-bold uppercase tracking-tight">Apoiar</span>
                  </button>
                )}
              </div>
            )}
      </div>
          </div>
        </div>

      {showActionsModal && (
        <PostActionsModal 
          isAuthor={isAuthor} 
          isPinned={!!post.isPinned}
          isFollowing={isFollowing}
          isSaved={isSaved}
          onSave={() => handleSave({ stopPropagation: () => {} } as any)}
          onClose={() => setShowActionsModal(false)} 
          onEdit={() => { setShowActionsModal(false); setShowEditModal(true); }} 
          onDelete={() => { setShowActionsModal(false); setShowDeleteModal(true); }} 
          onPin={() => { if(post.isPinned) unpinPost(post.id); else pinPost(post.id); onPostUpdatedOrDeleted(); setShowActionsModal(false); }} 
          onBoost={() => { setShowActionsModal(false); setShowBoostModal(true); }} 
          onFollow={() => { handleFollowInternal(); setShowActionsModal(false); }} 
          onIndicate={() => { setShowActionsModal(false); setShowIndicateModal(true); }} 
          isMonetized={!!post.isMonetized}
          canMonetize={currentUser.isMonetized}
          onToggleMonetization={async () => {
            const updated = { ...post, isMonetized: !post.isMonetized };
            await updatePost(updated);
            onPostUpdatedOrDeleted();
            setShowActionsModal(false);
          }}
          onReport={() => { 
            showConfirm(
              "Deseja realmente denunciar esta publicação?",
              async () => {
                await createReport({ reporterId: currentUser.id, targetId: post.id, targetType: 'POST', reason: 'DENÚNCIA', details: 'Via PostCard' }); 
                showSuccess("Denúncia enviada com sucesso. Nossa equipe irá analisar.");
                setShowActionsModal(false); 
              }
            );
          }} 
        />
      )}

      {showDetailModal && <PostDetailModal post={post} currentUser={currentUser} onClose={() => setShowDetailModal(false)} onUpdate={onPostUpdatedOrDeleted} onNavigate={onNavigate} refreshUser={refreshUser} initialVideoStats={videoStats} />}
      {showBoostModal && <BoostPostModal post={post} currentUser={currentUser} onClose={() => setShowBoostModal(false)} onSuccess={() => { refreshUser(); onPostUpdatedOrDeleted(); }} />}
      
      {showDeleteModal && (
        <DeleteConfirmModal 
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={async () => { 
            await deletePost(post.id); 
            onPostUpdatedOrDeleted(); 
            setShowDeleteModal(false); 
          }} 
        />
      )}
      
      {showEditModal && <EditPostModal postId={post.id} currentUser={currentUser} onClose={() => setShowEditModal(false)} onSuccess={onPostUpdatedOrDeleted} />}
      {showIndicateModal && <IndicateModal post={post} currentUser={currentUser} onClose={() => setShowIndicateModal(false)} onPostUpdated={onPostUpdatedOrDeleted} />}
      
      {showShareModal && (
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          currentUser={currentUser}
          onNavigate={onNavigate}
          content={{
            title: `Post de ${authorDisplayName}`,
            text: post.content || '',
            url: `${window.location.origin}/?page=post-detail&postId=${post.id}`,
            mediaUrl: post.imageUrl || post.reel?.videoUrl,
            mediaType: post.imageUrl ? 'image' : (post.reel?.videoUrl ? 'video' : undefined)
          }}
        />
      )}

      {showSuperModal && postAuthor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up font-sans text-left">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-550 flex items-center justify-center text-black font-black text-sm">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">Apoiar Criador</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Enviar Super Chat para {postAuthor.firstName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSuperModal(false)}
                className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center hover:scale-105 transition-all font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Info Creator */}
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/20 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/40">
                <img src={postAuthor.profilePicture || DEFAULT_PROFILE_PIC} className="w-8 h-8 rounded-full object-cover border" referrerPolicy="no-referrer" />
                <div>
                  <p className="text-xs font-black text-zinc-900 dark:text-white uppercase">{postAuthor.firstName} {postAuthor.lastName}</p>
                  <p className="text-[9px] text-zinc-400 uppercase font-bold">Criador de Conteúdo</p>
                </div>
              </div>

              {/* Quick selects */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400">Escolha o valor de apoio (AOA)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[200, 500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSuperAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        superAmount === amt
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 hover:dark:bg-zinc-700'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount or typing info */}
              <div className="space-y-2">
                <input
                  type="number"
                  value={superAmount}
                  onChange={(e) => setSuperAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  min={postAuthor.monetizationFeatures?.supersMinAmount || 100}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 text-center text-lg font-black text-amber-550 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 outline-none"
                  placeholder="Valor personalizado"
                />
                <div className="flex justify-between items-center text-[9px] text-zinc-400 uppercase font-bold px-1">
                  <span>Mínimo: {postAuthor.monetizationFeatures?.supersMinAmount || 100} AOA</span>
                  <span>Saldo: {currentUser.balance || 0} AOA</span>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400">Mensagem de Destaque (Super Chat)</label>
                <textarea
                  value={superMessage}
                  onChange={(e) => setSuperMessage(e.target.value)}
                  maxLength={150}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 outline-none min-h-[70px] resize-none"
                  placeholder="O que quer dizer ao criador? A sua mensagem ficará destacada!"
                />
                <p className="text-[8px] text-zinc-400 text-right uppercase font-bold">{superMessage.length}/150 caracteres</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuperModal(false)}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 hover:dark:bg-zinc-700 text-zinc-900 dark:text-white py-3 px-4 rounded-xl text-xs font-black uppercase transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submittingSuper || (currentUser.balance || 0) < superAmount || superAmount < (postAuthor.monetizationFeatures?.supersMinAmount || 100)}
                  onClick={handleSendSuper}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all duration-300 ${
                    !submittingSuper && (currentUser.balance || 0) >= superAmount && superAmount >= (postAuthor.monetizationFeatures?.supersMinAmount || 100)
                      ? 'bg-gradient-to-r from-amber-500 to-orange-550 text-black hover:brightness-110 shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {submittingSuper ? 'Enviando...' : 'Enviar Apoio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;

