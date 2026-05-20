import React, { useState, useEffect, useRef } from 'react';
import { User, Post, Comment } from '../types';
import { 
  XMarkIcon, 
  HeartIcon, 
  PaperAirplaneIcon, 
  UserGroupIcon, 
  VideoCameraIcon, 
  MicrophoneIcon, 
  SparklesIcon, 
  CurrencyDollarIcon,
  VideoCameraSlashIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/solid';
import { 
  subscribeToLivePost, 
  sendLiveMessage, 
  manageLiveViewers, 
  pulseLiveHeart, 
  processDonation, 
  findUserById, 
  updatePost 
} from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Send, 
  Users, 
  Tv, 
  ThumbsUp, 
  Share2, 
  ChevronDown, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  DollarSign, 
  Sparkles as SparkleIcon,
  Maximize2,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
  Eye,
  ArrowLeft,
  Youtube,
  Clock
} from 'lucide-react';

interface LiveStreamViewerProps {
  currentUser: User;
  postId: string;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => Promise<void>;
}

interface FlyingHeart {
  id: string;
  x: number;
  scale: number;
  duration: number;
  color: string;
}

const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ 
  currentUser, 
  postId, 
  onNavigate, 
  refreshUser 
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<User | null>(null);
  const [liveComments, setLiveComments] = useState<Comment[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(0);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  // Broadcaster states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [liveEnding, setLiveEnding] = useState(false);

  // Video Settings
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoVolume, setVideoVolume] = useState(60);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p60 FHD');

  // Subs Simulation
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Viewer donation modal and states
  const [showDonation, setShowDonation] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<number>(50);
  const [donationStatus, setDonationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Floating Hearts Local States
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);

  // Refs for video elements & auto-scrolling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const simVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const prevHeartsRef = useRef(0);

  const isHost = post ? post.userId === currentUser.id : false;

  // 1. Subscribe to Live stream updates, join and sync viewers count
  useEffect(() => {
    if (!postId) return;

    // Join room
    manageLiveViewers(postId, 'join');

    // Subscribe to real-time events
    const unsubscribe = subscribeToLivePost(postId, (updatedData: any) => {
      if (updatedData) {
        setPost(updatedData);
        setLiveComments(updatedData.liveChat || []);
        setViewerCount(updatedData.liveViewerCount || 0);
        setHearts(updatedData.liveHeartCount || 0);
      }
    });

    return () => {
      manageLiveViewers(postId, 'leave');
      unsubscribe();
    };
  }, [postId]);

  // 2. Load Creator Profile
  useEffect(() => {
    if (post?.userId) {
      findUserById(post.userId).then((profile) => {
        if (profile) setCreatorProfile(profile);
      }).catch(err => {
        console.error("error fetching creator profile:", err);
      });
    }
  }, [post?.userId]);

  // 3. Load Subscriber status
  useEffect(() => {
    if (creatorProfile?.id) {
      const isSub = localStorage.getItem(`subscribed_${creatorProfile.id}`) === 'true';
      setIsSubscribed(isSub);
    }
  }, [creatorProfile?.id]);

  // 4. Spawns floating hearts on screen whenever db heartCount increases
  useEffect(() => {
    if (hearts > prevHeartsRef.current) {
      const diff = hearts - prevHeartsRef.current;
      const count = Math.min(diff, 6); // Cap simultaneous visual spawns to safeguard performance
      for (let i = 0; i < count; i++) {
        spawnLocalHeart();
      }
      prevHeartsRef.current = hearts;
    } else if (hearts < prevHeartsRef.current) {
      prevHeartsRef.current = hearts;
    }
  }, [hearts]);

  // 5. Broadcaster: Initialize Camera if user is Host
  useEffect(() => {
    if (isHost && post?.liveStream?.status === 'LIVE' && !isSimulationMode) {
      initiateBroadcasterStream();
    }
    return () => {
      stopBroadcasterStream();
    };
  }, [isHost, post?.liveStream?.status, isSimulationMode]);

  // 5b. Host: Bind active camera stream to video element when rendered
  useEffect(() => {
    if (videoRef.current && cameraStream && !isSimulationMode) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isSimulationMode]);

  // 5c. Feed Loader Timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!post) {
        setIsTimeout(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [post]);

  // 6. Chat Auto-Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveComments]);

  // Synchronise simulated video states
  useEffect(() => {
    if (simVideoRef.current) {
      simVideoRef.current.muted = videoMuted;
      simVideoRef.current.volume = videoVolume / 100;
    }
  }, [videoMuted, videoVolume]);

  const initiateBroadcasterStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setCameraStream(stream);
      setIsCameraOff(false);
      setIsMuted(false);
      setIsSimulationMode(false);
    } catch (err) {
      console.warn("Could not acquire media stream, falling back to simulated high-fidelity loop:", err);
      setIsSimulationMode(true);
    }
  };

  const stopBroadcasterStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleToggleSimulationSource = () => {
    if (isSimulationMode) {
      setIsSimulationMode(false);
    } else {
      stopBroadcasterStream();
      setIsSimulationMode(true);
    }
  };

  // Toggle Camera inside real stream
  const toggleCamera = () => {
    if (cameraStream) {
      const videoTrack = cameraStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle Microphone inside real stream
  const toggleMic = () => {
    if (cameraStream) {
      const audioTrack = cameraStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Spawn visual floating heart inside the viewer
  const spawnLocalHeart = () => {
    const colors = [
      'text-red-500', 
      'text-pink-500', 
      'text-purple-500', 
      'text-yellow-400', 
      'text-cyan-400', 
      'text-amber-500'
    ];
    const newHeart: FlyingHeart = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.floor(Math.random() * 80) - 40, // offset left-to-right drift range
      scale: 0.7 + Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)]
    };

    setFlyingHearts(prev => [...prev, newHeart]);

    // Clean up heart element after animate duration
    setTimeout(() => {
      setFlyingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 3500);
  };

  // Pulse database heart count
  const handleLikeClick = () => {
    if (!post) return;
    spawnLocalHeart(); 
    pulseLiveHeart(postId);
  };

  // Subscribe state toggle
  const handleSubscribeToggle = () => {
    const val = !isSubscribed;
    setIsSubscribed(val);
    if (creatorProfile?.id) {
      localStorage.setItem(`subscribed_${creatorProfile.id}`, String(val));
    }
  };

  // Submit Comments
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || !commentText.trim() || isSending) return;

    setIsSending(true);
    const newComment: Comment = {
      id: 'comment_' + Date.now() + Math.random().toString(36).substr(2, 4),
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      profilePic: currentUser.profilePicture || '',
      text: commentText.trim(),
      timestamp: Date.now(),
      replies: [],
      isAnonymous: false
    };

    try {
      await sendLiveMessage(postId, newComment);
      setCommentText('');
    } catch (err) {
      console.error("Error sending live comment:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Process SuperChat or tipped donation
  const handleTipDonate = async () => {
    if (!post || !creatorProfile) return;
    setDonationStatus('processing');
    setErrorMessage('');

    try {
      await refreshUser();
      
      const currentBalance = currentUser.balance || 0;
      if (currentBalance < selectedDonation) {
        throw new Error(`Saldo insuficiente. Possui ${currentBalance} FaceCoins.`);
      }

      // 1. Process ledger transfer
      const success = await processDonation(
        currentUser.id, 
        post.userId, 
        selectedDonation, 
        `Super Chat Live: ${post.liveStream?.title || 'Stream ao vivo'}`
      );

      if (!success) {
        throw new Error("Transação recusada.");
      }

      // 2. Post a system notifier comment on the live chat representing Super Chat
      const systemMessage: Comment = {
        id: 'spec_donation_' + Date.now(),
        userId: 'system',
        userName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        profilePic: currentUser.profilePicture || '',
        text: `💰 SUPER CHAT: Apoiou o criador com ${selectedDonation} FaceCoins! 🎉`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };

      await sendLiveMessage(postId, systemMessage);
      
      // 3. Spawns celebratory heart rain
      for(let i = 0; i < 15; i++) {
        setTimeout(spawnLocalHeart, i * 120);
      }

      setDonationStatus('success');
      refreshUser(); // reload balances

      setTimeout(() => {
        setShowDonation(false);
        setDonationStatus('idle');
      }, 1500);

    } catch (err: any) {
      console.error("Donation failed:", err);
      setDonationStatus('error');
      setErrorMessage(err.message || 'Houve um erro no envio.');
    }
  };

  // Host: Shut down active live stream
  const handleEndLiveStream = async () => {
    if (!post || !isHost) return;
    setLiveEnding(true);

    try {
      const updatedPost: Post = {
        ...post,
        liveStream: {
          title: post.liveStream?.title || 'Transmissão ao vivo',
          description: post.liveStream?.description || '',
          status: 'ENDED',
          recordingUrl: 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-and-milky-way-40432-large.mp4' 
        }
      };
      await updatePost(updatedPost);
      stopBroadcasterStream();
    } catch (err) {
      console.error("Failed to terminate live:", err);
    } finally {
      setLiveEnding(false);
    }
  };

  // Get Simulated Subscribers tag
  const getSubscribersText = () => {
    if (!creatorProfile) return "1.2K";
    const seed = creatorProfile.firstName.charCodeAt(0) + (creatorProfile.lastName?.charCodeAt(0) || 5);
    return `${((seed * 3) % 45) + 5}.${(seed % 9)}K inscritos`;
  };

  // Pick simulation premium stream loop content based on creator
  const getSimulationSource = () => {
    const seed = post?.userId ? post.userId.charCodeAt(0) % 3 : 0;
    if (seed === 0) {
      return "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-and-milky-way-40432-large.mp4"; // Sky
    } else if (seed === 1) {
      return "https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-vegetables-in-a-pan-40811-large.mp4"; // Cooking presentation
    } else {
      return "https://assets.mixkit.co/videos/preview/mixkit-city-lights-at-night-aerial-view-40348-large.mp4"; // Beautiful Neon city walking
    }
  };

  if (!postId) {
    return (
      <div className="min-h-[100dvh] bg-[#0c0f17] flex flex-col items-center justify-center text-center p-6 text-white pb-24 font-sans">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <XMarkIcon className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-white">Transmissão Inválida</h3>
        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-6 px-4">Identificador da Live ausente ou incorreto.</p>
        <button 
          onClick={() => onNavigate('feed')}
          className="px-8 py-4 bg-white hover:bg-zinc-100 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all hover:scale-[1.02] shadow-xl"
        >
          Voltar ao Feed
        </button>
      </div>
    );
  }

  if (!post) {
    if (isTimeout) {
      return (
        <div className="min-h-[100dvh] bg-[#0e0e0e] flex flex-col items-center justify-center text-center p-6 text-white pb-24 font-sans">
          <div className="w-16 h-16 bg-red-650/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <VideoCameraSlashIcon className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-white">Transmissão Indisponível</h3>
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-6 px-4">Esta Live pode ter sido encerrada pelo anfitrião ou o sinal falhou.</p>
          <button 
            onClick={() => onNavigate('feed')}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all hover:scale-[1.02] shadow-xl"
          >
            Voltar ao Feed
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] bg-[#0f0f0f] flex flex-col items-center justify-center text-center p-6 text-white pb-24 font-sans">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-extrabold tracking-widest text-[10px] uppercase text-zinc-400">Carregando player no formato YouTube...</p>
      </div>
    );
  }

  const isEnded = post.liveStream?.status === 'ENDED';

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f0f] text-[#f1f1f1] flex flex-col overflow-hidden font-sans select-none">
      
      {/* 1. YouTube top visual bar header */}
      <header className="bg-[#0f0f0f] border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('feed')}
            className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-100 transition-colors"
            title="Voltar ao Feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 text-white">
            <Youtube className="h-6 w-6 text-red-600 fill-current" />
            <span className="font-black tracking-tighter text-lg">FaceTube</span>
            <span className="text-[9px] bg-red-600 text-white px-1 ml-1 rounded font-black uppercase tracking-wide animate-pulse">AO VIVO</span>
          </div>
        </div>

        {/* Top bar host controllers */}
        {isHost && !isEnded && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
              Painel do Produtor
            </span>
            <button 
              onClick={handleToggleSimulationSource}
              className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full transition-all border ${isSimulationMode ? 'bg-amber-600 text-white border-amber-500' : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'}`}
              title="Troca sinal de transmissão em tempo real"
            >
              {isSimulationMode ? '📺 Usar Minha Webcam' : '🤖 Usar Transmissão de Vídeo'}
            </button>
          </div>
        )}
      </header>

      {/* 2. Main content Grid container */}
      <div className="flex-1 w-full max-w-[1780px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 overflow-y-auto lg:overflow-hidden h-[calc(100vh-56px)]">
        
        {/* LEFT COLUMN: video element & title and descriptions (collapsible) */}
        <main className={`col-span-12 ${isCinemaMode ? 'lg:col-span-12' : 'lg:col-span-9'} flex flex-col h-full overflow-y-auto pr-0 lg:pr-1 pb-32 scrollbar-none`}>
          
          {isEnded ? (
            /* Live Stream is finished layout */
            <div className="aspect-video w-full max-w-4xl mx-auto bg-zinc-950 rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-zinc-800 shadow-2xl">
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center mb-5 text-zinc-500 shadow-2xl">
                <VideoCameraSlashIcon className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">Transmissão Encerrada</h1>
              <p className="text-zinc-400 text-xs mt-1 uppercase font-bold tracking-wider">A transmissão ao vivo foi encerrada pelo apresentador.</p>
              
              <div className="grid grid-cols-2 gap-6 w-full max-w-sm bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/60 my-6">
                <div>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Espectadores Totais</p>
                  <p className="text-xl font-black mt-1 text-white">{viewerCount + 45}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-pink-500 uppercase tracking-wider">Total de Likes</p>
                  <p className="text-xl font-black mt-1 text-white">❤️ {hearts}</p>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('feed')}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs tracking-wider rounded-full transition-all active:scale-95 shadow-lg"
              >
                Retornar ao Feed Social
              </button>
            </div>
          ) : (
            /* Live Active Stream View */
            <div className="w-full">
              
              {/* Aspect Ratio widescreen container */}
              <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-zinc-800/60 shadow-xl group/player">
                
                {/* 1. Real Webcam Host Stream */}
                {isHost && !isSimulationMode && cameraStream ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted={videoMuted} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                ) : (
                  /* 2. Premium simulated Looping live presentation (ALWAYS works for viewers or if camera not active) */
                  <video 
                    ref={simVideoRef}
                    src={getSimulationSource()}
                    autoPlay 
                    loop 
                    muted={videoMuted} 
                    playsInline 
                    className="w-full h-full object-cover"
                    onError={() => console.error("Simulated stream source error")}
                  />
                )}

                {/* Blinking Live Badge on screen */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10">
                  <div className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                  <span className="text-[9px] font-black text-white tracking-wider uppercase">AO VIVO</span>
                  <span className="text-zinc-400 text-[10px] font-bold shrink-0">|</span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-zinc-100">
                    <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>{viewerCount}</span>
                  </div>
                </div>

                {/* Host specific hardware HUD inside the player */}
                {isHost && (
                  <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>MODO TRANSMISSÃO</span>
                  </div>
                )}

                {/* Float Render Flying Hearts overlay (Bottom right corner of Player) */}
                <div className="absolute bottom-16 right-4 z-25 w-[140px] h-[200px] overflow-hidden pointer-events-none flex items-end justify-center">
                  <AnimatePresence>
                    {flyingHearts.map(heart => (
                      <motion.div
                        key={heart.id}
                        initial={{ opacity: 0, y: 200, x: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0], 
                          y: 0, 
                          x: heart.x,
                          rotate: heart.x * 0.5
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: heart.duration, ease: 'easeOut' }}
                        className="absolute bottom-0 font-sans"
                        style={{ scale: heart.scale }}
                      >
                        <Heart className={`h-8 w-8 ${heart.color} fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]`} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* 3. YouTube Widescreen Controls Overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover/player:opacity-100 transition-opacity duration-350 flex flex-col gap-3">
                  {/* Custom progress slider simulation */}
                  <div className="w-full bg-zinc-700/50 h-1.5 rounded-full overflow-hidden cursor-pointer">
                    <div className="bg-red-650 h-full w-[94%]" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Playback Simulation Status */}
                      <span className="text-[10px] font-black bg-red-650 text-white px-2 py-0.5 rounded flex items-center gap-1 font-sans">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        AO VIVO EM DIRETO
                      </span>

                      {/* Unified Volume simulation controls */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setVideoMuted(!videoMuted)}
                          className="p-1.5 text-zinc-100 hover:text-white rounded"
                          title={videoMuted ? "Ativar Áudio" : "Mutar Áudio"}
                        >
                          {videoMuted ? <VolumeX className="h-5 w-5 text-red-500" /> : <Volume2 className="h-5 w-5" />}
                        </button>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={videoVolume} 
                          onChange={e => {
                            setVideoVolume(Number(e.target.value));
                            if(videoMuted) setVideoMuted(false);
                          }}
                          className="w-16 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none" 
                        />
                      </div>
                    </div>

                    {/* Right aligned player options */}
                    <div className="flex items-center gap-3">
                      {/* Quality Picker */}
                      <div className="relative">
                        <button 
                          onClick={() => setQualityMenuOpen(!qualityMenuOpen)}
                          className="text-[10px] font-black uppercase text-zinc-300 hover:text-white bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800"
                        >
                          {selectedQuality}
                        </button>
                        {qualityMenuOpen && (
                          <div className="absolute bottom-8 right-0 bg-zinc-950/95 border border-zinc-800 p-1.5 rounded-xl shadow-2xl z-40 text-left min-w-[120px]">
                            {['1080p60 FHD', '720p60 HD', '360p Automático'].map(q => (
                              <button
                                key={q}
                                onClick={() => {
                                  setSelectedQuality(q);
                                  setQualityMenuOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-[10px] font-bold rounded-lg ${selectedQuality === q ? 'bg-red-600/10 text-red-400' : 'text-zinc-400 hover:bg-zinc-900'}`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => setIsCinemaMode(!isCinemaMode)}
                        className="p-1 text-zinc-300 hover:text-white"
                        title={isCinemaMode ? "Sair do Modo Teatro" : "Modo Teatro"}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* 4. Stream Metadata (Title, Creator bar, Actions, collapsable descriptions) */}
              <div className="mt-4 text-left">
                {/* Title */}
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                  {post.liveStream?.title || 'Transmissão ao vivo do FacePhone'}
                </h1>

                {/* Creator Profile row & Actions panel */}
                <div className="mt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                  
                  {/* Host Section */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={creatorProfile?.profilePicture || '/default-avatar.png'} 
                      alt="avatar" 
                      className="w-11 h-11 rounded-full object-cover border-2 border-red-600 shadow-md shrink-0" 
                    />
                    <div className="text-left leading-snug">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100 text-sm hover:text-red-500 duration-150 cursor-pointer">
                          {creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : 'Canal do Criador'}
                        </span>
                        <span className="bg-zinc-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider text-zinc-400 flex items-center gap-0.5">
                          ⭐ VERIFICADO
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{getSubscribersText()}</p>
                    </div>

                    {/* Subscription Simulator Button */}
                    <button 
                      onClick={handleSubscribeToggle}
                      className={`ml-3.5 px-4 py-2 text-xs font-black uppercase rounded-full tracking-wider transition-all duration-200 active:scale-95 shrink-0 ${isSubscribed ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-[#f1f1f1] hover:bg-[#d9d9d9] text-[#0f0f0f]'}`}
                    >
                      {isSubscribed ? 'Inscrito' : 'Inscrever-se'}
                    </button>
                  </div>

                  {/* Right hand buttons */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Thumbs up Likes block */}
                    <div className="flex items-center bg-[#272727] hover:bg-[#3f3f3f] rounded-full shrink-0">
                      <button 
                        onClick={handleLikeClick}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-white hover:text-red-500 duration-150 rounded-full"
                        title="Marcar Gostei"
                      >
                        <ThumbsUp className={`h-4 w-4 ${hearts > 0 ? 'text-red-500 shrink-0 fill-current' : ''}`} />
                        <span>{hearts}</span>
                      </button>
                    </div>

                    {/* FaceCoins Donation Trigger (Viewer side) */}
                    {!isHost && (
                      <button 
                        onClick={() => setShowDonation(true)}
                        className="flex items-center gap-1 bg-amber-500 text-[#0f0f0f] hover:bg-amber-400 font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider shadow-lg duration-150 active:scale-95 shrink-0 animate-pulse"
                      >
                        <DollarSign className="h-4 w-4 shrink-0" />
                        <span>Apoiar Criador</span>
                      </button>
                    )}

                    {/* Share Simulation Pill */}
                    <button 
                      onClick={() => alert(`Link de compartilhamento copiado! Envie: ${window.location.origin}/#/live/${postId}`)}
                      className="flex items-center gap-1.5 bg-[#272727] hover:bg-[#3f3f3f] text-white font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider transition-all active:scale-95 border border-zinc-800 shrink-0"
                    >
                      <Share2 className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                      <span>Compartilhar</span>
                    </button>

                    {/* Host Special Exit & Terminate tools */}
                    {isHost && (
                      <button 
                        onClick={handleEndLiveStream}
                        disabled={liveEnding}
                        className="px-5 py-2.5 bg-red-650 hover:bg-red-600 disabled:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider rounded-full transition-all leading-none focus:outline-none shrink-0"
                      >
                        {liveEnding ? 'Encerrando...' : 'Encerrar Live'}
                      </button>
                    )}

                  </div>

                </div>

                {/* Collapsible Gray description information box */}
                <div 
                  className="mt-4 bg-[#272727] hover:bg-[#323232] duration-200 transition-colors p-3.5 rounded-xl cursor-pointer text-left"
                  onClick={() => setShowDescription(!showDescription)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-neutral-100 uppercase tracking-widest">
                      <span className="text-red-500 font-extrabold">{viewerCount + 37} assistindo</span>
                      <span>•</span>
                      <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-zinc-400 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <span>{showDescription ? 'Recolher Detalhes' : 'Ver Descrição'}</span>
                      <ChevronDown className={`h-4.5 w-4.5 transform transition-transform ${showDescription ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  <div className="mt-2 text-zinc-300 text-xs leading-relaxed">
                    <p className="font-bold text-zinc-100">Descrição do Stream</p>
                    {showDescription ? (
                      <div className="mt-3.5 pt-3 border-t border-zinc-700/50 space-y-2 text-zinc-400">
                        <p className="whitespace-pre-wrap">{post.content || post.liveStream?.description || 'O anfitrião não configurou nenhuma descrição para esta transmissão ao vivo.'}</p>
                        <div className="pt-2.5 flex flex-col gap-1 text-[9px] uppercase font-bold text-zinc-500">
                          <span>Categoria: Stream Digital</span>
                          <span>Format: 1080p60 FHD</span>
                          <span>Moderação de Spam: Ativada</span>
                          <span>Criador ID: {post.userId}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-400 mt-1 truncate max-w-xl">{post.content || post.liveStream?.description || 'Nenhum detalhe adicional fornecido para esta transmissão ao vivo.'}</p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

        {/* RIGHT COLUMN: Live Chat Sidebar (independent scroll bar window) */}
        {!isEnded && (
          <aside className={`col-span-12 ${isCinemaMode ? 'lg:col-span-12 mt-4' : 'lg:col-span-3'} flex flex-col bg-[#181818] rounded-xl border border-zinc-800 overflow-hidden h-[500px] lg:h-[calc(100vh-100px)] min-h-[400px] shrink-0`}>
            
            {/* Live Chat Header styled exactly like YouTube live chat banner */}
            <div className="px-4 py-3 border-b border-zinc-805 bg-[#1f1f1f] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-zinc-100">
                <span className="text-xs font-black uppercase tracking-widest">Chat ao Vivo</span>
                <ChevronDown className="h-4.5 w-4.5 text-zinc-400 cursor-pointer" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 rounded-full w-4 bg-red-600 animate-pulse" />
                <span className="text-[9px] font-mono font-bold bg-[#2a2a2a] text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sincronizado
                </span>
              </div>
            </div>

            {/* Comments List flow container */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
              {liveComments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-5 mt-20">
                  <div className="w-12 h-12 bg-red-650/10 rounded-full flex items-center justify-center mb-3">
                    <Tv className="h-6 w-6 text-red-500" />
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-1 text-white">Nenhuma Mensagem</h4>
                  <p className="text-[10px] text-zinc-400 font-medium max-w-[200px]">Participe do fluxo enviando uma mensagem ou apoiando o canal!</p>
                </div>
              ) : (
                liveComments.map(c => {
                  const isSystem = c.userId === 'system';
                  // Check if comment is custom tipped SuperChat message
                  const isSuperChat = isSystem && c.text.includes('SUPER CHAT');

                  if (isSuperChat) {
                    // Extract tipped coins from message text if available (usually default or from text)
                    const coinsWord = c.text.match(/(\d+)\s+FaceCoins/);
                    const amount = coinsWord ? coinsWord[1] : '50';
                    const cleanedMsg = c.text.replace('💰 SUPER CHAT: ', '');

                    return (
                      <div key={c.id} className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl overflow-hidden shadow-lg border border-amber-400/30 text-left my-2 animate-bounce flex flex-col">
                        <div className="bg-amber-600 px-3.5 py-2 flex items-center justify-between text-xs font-black text-zinc-950">
                          <div className="flex items-center gap-2">
                            <span className="bg-zinc-950 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded">SUPER CHAT</span>
                            <span className="truncate max-w-[130px]">{c.userName}</span>
                          </div>
                          <span className="font-mono bg-black/15 px-2 py-0.5 rounded-full text-[9px]">💰 {amount} COINS</span>
                        </div>
                        <div className="p-3 text-xs font-semibold text-amber-50">
                          {cleanedMsg}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={c.id} className="text-left flex gap-2.5 items-start bg-zinc-900/10 p-1 rounded hover:bg-zinc-900/30 duration-100">
                      <img 
                        src={c.profilePic || '/default-avatar.png'} 
                        alt="avatar" 
                        className="w-7 h-7 rounded-full object-cover border border-zinc-800 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-[10px] font-black tracking-tight ${isSystem ? 'text-amber-400' : 'text-zinc-400 hover:text-white cursor-pointer'}`}>
                            {c.userName}
                          </span>
                          {c.userId === post.userId && (
                            <span className="text-[7px] bg-red-650 text-white font-black uppercase px-1 rounded">CRIADOR</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 leading-relaxed break-words font-medium ${isSystem ? 'text-amber-300 mt-1 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10' : 'text-zinc-200'}`}>
                          {c.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Live Chat message Form with Coin button right there! */}
            <form onSubmit={handleCommentSubmit} className="p-3 bg-[#121212] border-t border-zinc-800 flex flex-col gap-2 relative shrink-0">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Chat ao vivo na transmissão..." 
                  className="flex-1 min-w-0 bg-[#272727] hover:bg-[#333333] focus:bg-[#333333] focus:ring-1 focus:ring-red-600 border border-transparent rounded-full px-4.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all font-medium"
                />
                
                {/* FaceCoins tip trigger directly in the chat input */}
                {!isHost && (
                  <button 
                    type="button"
                    onClick={() => setShowDonation(true)}
                    className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-full transition-all hover:scale-110 shrink-0"
                    title="Enviar Super Chat de Apoio"
                  >
                    <DollarSign className="h-4.5 w-4.5" />
                  </button>
                )}

                <button 
                  type="submit" 
                  disabled={isSending || !commentText.trim()}
                  className="p-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-35 disabled:hover:bg-red-600 text-white rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-lg"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider px-2">
                <span>Conectado como {currentUser.firstName}</span>
                <span className="text-amber-500/80">Saldo: {currentUser.balance || 0} FaceCoins</span>
              </div>
            </form>

          </aside>
        )}

      </div>

      {/* 3. Sliding Coin Tipping modal (FaceCoins SuperChat popup on click) */}
      {showDonation && (
        <div 
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            if (donationStatus !== 'processing') setShowDonation(false);
          }}
        >
          <div 
            className="w-full sm:max-w-md bg-[#1f1f1f] border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-2xl p-6 relative flex flex-col gap-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Top drawer handlebar */}
            <div className="w-11 h-1.5 bg-zinc-800 rounded-full mx-auto sm:hidden mb-1" />

            <div className="flex justify-between items-center text-left">
              <div>
                <h3 className="text-base font-black uppercase text-white tracking-tight flex items-center gap-1.5">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  <span>Apoiar Canal (FaceTube Super Chat)</span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Saldo em conta: {currentUser.balance || 0} FaceCoins</p>
              </div>
              <button 
                onClick={() => setShowDonation(false)}
                disabled={donationStatus === 'processing'}
                className="p-2 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all"
              >
                <XMarkIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            {donationStatus === 'success' ? (
              <div className="text-center py-8 flex flex-col items-center">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3 animate-bounce">
                  <SparkleIcon className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-black text-white uppercase tracking-tight">Super Chat Enviado!</h4>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1">Sua contribuição foi registrada ao vivo!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                
                {/* Donation selection grid */}
                <div className="grid grid-cols-4 gap-2.5 text-left">
                  {[20, 50, 100, 500].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setSelectedDonation(amount)}
                      disabled={donationStatus === 'processing'}
                      className={`py-3.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${selectedDonation === amount ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-transparent border-zinc-800 hover:border-zinc-700 text-zinc-300'}`}
                    >
                      <span className="text-xs font-black uppercase text-zinc-400">Pagar</span>
                      <span className="text-sm font-black text-amber-400">{amount}</span>
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Coins</span>
                    </button>
                  ))}
                </div>

                {/* Account balance verification checks warning indicator */}
                {donationStatus === 'error' && (
                  <p className="text-[11px] text-red-400 font-bold uppercase tracking-tight text-center bg-red-500/10 border border-red-500/20 p-3 rounded-xl leading-relaxed">
                    ⚠️ {errorMessage}
                  </p>
                )}

                {/* Send action footer button */}
                <button
                  type="button"
                  onClick={handleTipDonate}
                  disabled={donationStatus === 'processing'}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 font-black uppercase text-xs tracking-wider rounded-full transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  {donationStatus === 'processing' ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin inline-block"></span>
                  ) : (
                    `Comprar Super Chat por ${selectedDonation} FaceCoins`
                  )}
                </button>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default LiveStreamViewer;
