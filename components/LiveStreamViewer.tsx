
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post, User, Comment, Page } from '../types';
import { 
  getPosts, 
  findUserById, 
  processDonation, 
  updatePost,
  subscribeToLivePost,
  sendLiveMessage,
  manageLiveViewers,
  pulseLiveHeart,
  generateUUID,
  uploadFile,
  CLOUDINARY_CLOUD_NAME
} from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { 
  XMarkIcon, 
  HeartIcon
} from '@heroicons/react/24/solid';
import { DEFAULT_PROFILE_PIC } from '../data/constants';

// Sub-components
import LiveStreamChat from './LiveStream/LiveStreamChat';
import LiveStreamOverlay from './LiveStream/LiveStreamOverlay';
import LiveStreamParticipants from './LiveStream/LiveStreamParticipants';
import LiveStreamSettings from './LiveStream/LiveStreamSettings';
import LiveStreamRecording from './LiveStream/LiveStreamRecording';
import LiveStreamStream from './LiveStream/LiveStreamStream';
import LiveStreamBroadcast from './LiveStream/LiveStreamBroadcast';

interface LiveStreamViewerProps {
  currentUser: User;
  postId: string;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ currentUser, postId, onNavigate, refreshUser }) => {
  const { showAlert, showConfirm } = useDialog();
  const [post, setPost] = useState<Post | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showControls, setShowControls] = useState(false); 
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [isProcessingDonation, setIsProcessingDonation] = useState(false);
  const [isEnding, setIsEnding] = useState(false); // Estado de encerramento
  const [donationAlert, setDonationAlert] = useState<{name: string, amount: number} | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Real-time Data
  const [chatMessages, setChatMessages] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<{id: number, left: number, color: string}[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [lastHeartCount, setLastHeartCount] = useState(0);
  
  const streamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const isInitializedRef = useRef(false);

  const stopStreams = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
  }, []);

  // 1. Initial Load & Creator Info
  useEffect(() => {
    const fetchData = async () => {
        const posts = await getPosts();
        const foundPost = posts.find(p => p.id === postId);
        if (foundPost && foundPost.liveStream) {
            setPost(foundPost);
            const author = await findUserById(foundPost.userId);
            setCreator(author || null);
        } else {
            onNavigate('feed');
        }
    };
    fetchData();

    return () => {
      stopStreams();
    };
  }, [postId, onNavigate, stopStreams]);

  // 2. Real-time Subscription
  useEffect(() => {
    if (!postId) return;

    manageLiveViewers(postId, 'join');

    const unsubscribe = subscribeToLivePost(postId, (updatedPost: Post | undefined) => {
        if (!updatedPost) return;
        
        if (updatedPost.liveStream?.status === 'ENDED') {
            if (currentUser.id !== updatedPost.userId) {
                showAlert("A transmissão foi encerrada pelo professor.", { type: 'alert' });
                onNavigate('feed');
            }
            return;
        }

        if (updatedPost.liveChat) {
            setChatMessages(updatedPost.liveChat);
        }

        if (updatedPost.liveViewerCount !== undefined) {
            setViewerCount(updatedPost.liveViewerCount);
        }

        if (updatedPost.liveHeartCount && updatedPost.liveHeartCount > lastHeartCount) {
            const diff = updatedPost.liveHeartCount - lastHeartCount;
            for(let i=0; i<Math.min(diff, 5); i++) {
                setTimeout(() => addFloatingHeart(false), i * 150);
            }
            setLastHeartCount(updatedPost.liveHeartCount);
        }
    });

    return () => {
        unsubscribe();
        manageLiveViewers(postId, 'leave');
    };
  }, [postId, lastHeartCount, currentUser.id, onNavigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const startRecording = (stream: MediaStream) => {
    try {
        const options = { mimeType: 'video/webm' };
        const recorder = new MediaRecorder(stream, options);
        
        recordedChunksRef.current = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };
        
        recorder.start(1000); // 1s chunks
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        console.log("Gravação iniciada");
    } catch (e) {
        console.warn("MediaRecorder falhou ou não suportado:", e);
    }
  };

  const stopRecordingAndGetBlob = (): Promise<Blob> => {
      return new Promise((resolve) => {
          const recorder = mediaRecorderRef.current;
          if (!recorder) {
              resolve(new Blob([], { type: 'video/webm' }));
              return;
          }

          const finish = () => {
              const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
              resolve(blob);
          };

          if (recorder.state === 'recording') {
              recorder.onstop = finish;
              recorder.stop();
          } else {
              finish();
          }
      });
  };

  const handleEndLive = async () => {
    if (!post) return;
    setIsEnding(true); // Mostra loader
    
    try {
        let recordingUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/v1740939023/cyberphone/reels/ba776274-0f2c-497d-b08e-32432924403c.webm`; // Fallback default

        // Tentar parar gravação e fazer upload
        if (mediaRecorderRef.current) {
            const blob = await stopRecordingAndGetBlob();
            if (blob.size > 0) {
                // Upload real
                try {
                    recordingUrl = await uploadFile(blob, 'recordings');
                } catch (upErr) {
                    console.error("Erro no upload da gravação, usando fallback.", upErr);
                }
            }
        }

        stopStreams();

        const updatedPost: Post = {
            ...post,
            liveStream: {
                ...post.liveStream!,
                status: 'ENDED',
                recordingUrl: recordingUrl
            }
        };
        await updatePost(updatedPost);
        await refreshUser();
        
        // Pequeno delay para UX
        setTimeout(() => {
            onNavigate('profile', { userId: currentUser.id });
        }, 1500);

    } catch (e) {
        console.error("Erro ao encerrar live:", e);
        setIsEnding(false);
        handleExit();
    }
  };

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      videoElementRef.current = node;
      if (isCamOn && streamRef.current) {
        node.srcObject = streamRef.current;
      }
    } else {
      videoElementRef.current = null;
    }
  }, [isCamOn]);

  const toggleCamera = async () => {
    if (isCamOn) {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => {
          track.stop();
        });
      }
      setIsCamOn(false);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (!streamRef.current) streamRef.current = new MediaStream();
        streamRef.current.getVideoTracks().forEach(t => { t.stop(); streamRef.current?.removeTrack(t); });
        streamRef.current.addTrack(videoTrack);
        
        setIsCamOn(true);
        if (videoElementRef.current) {
            videoElementRef.current.srcObject = streamRef.current;
        }
      } catch (err) { showAlert("Câmera indisponível.", { type: 'error' }); }
    }
  };

  useEffect(() => {
      if (creator && currentUser.id === creator.id && post && !isInitializedRef.current) {
          isInitializedRef.current = true;
          
          const initCam = async () => {
              try {
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                      video: { facingMode: 'user' }, 
                      audio: true 
                  });
                  streamRef.current = stream;
                  if (videoElementRef.current) {
                      videoElementRef.current.srcObject = stream;
                  }
                  // Start recording automatically for host
                  startRecording(stream);
              } catch (e) {
                  console.error("Erro camera:", e);
                  showAlert("Erro ao acessar câmera. Verifique permissões.", { type: 'error' });
              }
          };
          initCam();
      }
  }, [creator, currentUser.id, post]); 

  const toggleMic = async () => {
    if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.enabled = !isMicOn);
        setIsMicOn(!isMicOn);
    }
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    setShowControls(false);
    if (!isHandRaised) {
      showAlert("✋ Você levantou a mão! O professor foi notificado.", { type: 'alert' });
      pulseLiveHeart(postId);
    }
  };

  const handleExit = () => {
    stopStreams();
    onNavigate('feed');
  };

  const confirmEndLive = async () => {
    const confirmed = await showConfirm("Deseja encerrar e salvar esta aula na sua biblioteca para que os alunos possam assistir depois?", {
      title: "Encerrar Transmissão",
      confirmText: "Encerrar e Salvar",
      cancelText: "Continuar Aula"
    });
    if (confirmed) {
      handleEndLive();
    }
  };

  const [donationMessage, setDonationMessage] = useState('');

  const executeDonation = async () => {
    if (!pendingAmount || !creator || !post) return;
    
    if ((currentUser.balance || 0) < pendingAmount) { 
        showAlert("Saldo insuficiente.", { type: 'error' }); 
        return; 
    }
    
    setIsProcessingDonation(true);
    
    const success = await processDonation(currentUser.id, creator.id, pendingAmount, `Super Chat: ${post.liveStream?.title || 'Aula'}`);
    
    if (success) {
        refreshUser();
        setDonationAlert({ name: currentUser.firstName, amount: pendingAmount });
        
        const superChatMsg: Comment = {
            id: generateUUID(),
            userId: currentUser.id,
            userName: currentUser.firstName,
            text: donationMessage || `🎉 Doou $${pendingAmount}!`,
            timestamp: Date.now(),
            profilePic: currentUser.profilePicture,
            isSuperChat: true,
            superChatAmount: pendingAmount
        };
        sendLiveMessage(postId, superChatMsg);
        pulseLiveHeart(postId);

        setTimeout(() => setDonationAlert(null), 5000);
        setIsProcessingDonation(false);
        setPendingAmount(null);
        setDonationMessage('');
        setShowDonationModal(false);
    } else {
        showAlert("Erro ao processar doação.", { type: 'error' });
        setIsProcessingDonation(false);
    }
  };

  const addFloatingHeart = (isMe = true, customColor = '') => {
    const id = Date.now() + Math.random();
    const colors = ['text-red-500', 'text-pink-500', 'text-purple-500', 'text-blue-500'];
    const color = customColor || (isMe ? 'text-red-500' : colors[Math.floor(Math.random() * colors.length)]);
    const left = 50 + (Math.random() * 40); 

    setFloatingHearts(prev => [...prev, { id, left, color }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };

  const handleSendHeart = () => {
      addFloatingHeart(true, 'text-red-600'); 
      pulseLiveHeart(postId); 
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const msg: Comment = {
        id: generateUUID(),
        userId: currentUser.id,
        userName: currentUser.firstName,
        text: newMessage,
        timestamp: Date.now(),
        profilePic: currentUser.profilePicture
    };

    setNewMessage('');
    setChatMessages(prev => [...prev, msg]);
    await sendLiveMessage(postId, msg);
  };

  if (!post || !post.liveStream || !creator) return null;
  const isProfessional = currentUser.id === creator.id;

  return (
    <div className="fixed inset-0 bg-[#020408] z-[2000] flex flex-col h-[100dvh] w-full overflow-hidden text-white font-sans animate-fade-in">
      
      {/* VIDEO LAYER */}
      <LiveStreamStream 
        ref={setVideoRef}
        isProfessional={isProfessional}
        creator={creator}
        isCamOn={isCamOn}
      />

      {/* OVERLAY INTERFACE */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">
        
        {/* HEADER */}
        <header className="w-full flex items-center justify-between px-4 pt-4 pb-12 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
           <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full p-1 pr-3 border border-white/10 shadow-lg max-w-[65%]">
                <img src={creator.profilePicture || DEFAULT_PROFILE_PIC} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/20 object-cover shrink-0" referrerPolicy="no-referrer" />
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-wide leading-none text-white truncate">{creator.firstName}</span>
                    <span className="text-[8px] md:text-[10px] text-white/70 font-bold uppercase truncate">{post.liveStream.title}</span>
                </div>
                {!isProfessional && (
                    <button className="bg-red-600 text-[8px] md:text-[9px] font-black px-2 py-1 rounded-lg uppercase ml-1 hover:bg-red-700 transition-colors shadow-md shrink-0">
                        + Seguir
                    </button>
                )}
           </div>

           <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end">
                 <LiveStreamBroadcast isRecording={isRecording} onEndLive={confirmEndLive} />
                 <LiveStreamParticipants viewerCount={viewerCount} />
              </div>
              <button 
                onClick={isProfessional ? confirmEndLive : handleExit} 
                className="p-2 bg-black/20 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/5 transition-all active:scale-90"
              >
                 <XMarkIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </button>
           </div>
        </header>

        {/* Loading Overlay when Ending */}
        <LiveStreamRecording isEnding={isEnding} />

        {/* MIDDLE LAYER - Overlay Stats & Hearts */}
        <div className="flex-1 relative w-full pointer-events-none">
           <LiveStreamOverlay 
              viewerCount={viewerCount}
              isRecording={isRecording}
              isProfessional={isProfessional}
              donationAlert={donationAlert}
              floatingHearts={floatingHearts}
              isHandRaised={isHandRaised}
           />
        </div>

        {/* BOTTOM LAYER - Chat & Controls */}
        <div className="w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-24 pb-8 md:pb-6 px-4 flex flex-col justify-end gap-3 pointer-events-auto">
           <div className="w-[85%] md:w-[400px] h-40 md:h-64">
              <LiveStreamChat 
                messages={chatMessages}
                currentUser={currentUser}
                onSendMessage={(text) => handleSendMessage({ preventDefault: () => {}, target: { value: text } } as any)}
              />
           </div>

           <div className="flex items-center gap-2 md:gap-3 pb-safe mb-2 md:mb-0">
              <div className="flex-1"></div> {/* Spacer for layout consistency if needed */}
              
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                 <button 
                   onClick={handleSendHeart}
                   className="p-3 bg-gradient-to-tr from-pink-500 to-red-600 text-white rounded-full shadow-lg shadow-red-500/30 active:scale-75 transition-transform"
                 >
                    <HeartIcon className="h-5 w-5" />
                 </button>

                 <LiveStreamSettings 
                    isProfessional={isProfessional}
                    isMicOn={isMicOn}
                    isCamOn={isCamOn}
                    isHandRaised={isHandRaised}
                    showControls={showControls}
                    setShowControls={setShowControls}
                    onToggleMic={toggleMic}
                    onToggleCam={toggleCamera}
                    onToggleHandRaise={toggleHandRaise}
                    onEndLive={confirmEndLive}
                    onShowDonation={() => setShowDonationModal(true)}
                 />
              </div>
           </div>
        </div>
      </div>

      {showDonationModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDonationModal(false)}>
           <div className="bg-white dark:bg-[#12141c] w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative border border-white/5" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter text-center mb-8">Super Chat</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                 {[1, 5, 10, 20, 50, 100].map(val => (
                   <button key={val} onClick={() => setPendingAmount(val)} className={`py-4 rounded-2xl font-black text-sm transition-all ${pendingAmount === val ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>${val}</button>
                 ))}
              </div>

              <div className="mb-8">
                 <input 
                   type="text" 
                   placeholder="Enviar mensagem especial..." 
                   value={donationMessage}
                   onChange={(e) => setDonationMessage(e.target.value)}
                   className="w-full bg-gray-100 dark:bg-white/5 border dark:border-white/10 rounded-2xl p-4 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
                   maxLength={100}
                 />
                 <p className="text-[10px] text-gray-400 font-bold mt-2 text-right">{donationMessage.length}/100</p>
              </div>

              <button 
                onClick={executeDonation} 
                disabled={!pendingAmount || isProcessingDonation} 
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 disabled:grayscale"
              >
                {isProcessingDonation ? 'Processando...' : 'Confirmar Envio'}
              </button>
           </div>
        </div>
      )}

      <style>{`
        .mask-gradient-chat {
           mask-image: linear-gradient(to top, black 85%, transparent 100%);
           -webkit-mask-image: linear-gradient(to top, black 85%, transparent 100%);
        }
        .pb-safe {
           padding-bottom: max(env(safe-area-inset-bottom), 20px);
        }
        @keyframes slide-right-fade {
           from { opacity: 0; transform: translateX(-10px); }
           to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-right-fade { animation: slide-right-fade 0.2s ease-out forwards; }
        @keyframes shoutout { 0% { transform: translate(-50%, -100%); opacity: 0; } 15% { transform: translate(-50%, 0); opacity: 1; } 85% { transform: translate(-50%, 0); opacity: 1; } 100% { transform: translate(-50%, -100%); opacity: 0; } }
        .animate-shoutout { animation: shoutout 5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>
    </div>
  );
};

export default LiveStreamViewer;
