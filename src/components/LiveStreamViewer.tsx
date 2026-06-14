import React, { useState, useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { User, Post, Comment } from '../types';
import { 
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
  updatePost,
  toggleFollowUser,
  getUsers,
  db
} from '../services/storageService';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import WalletModal from './WalletModal';
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
  Clock,
  X,
  Trophy,
  Target,
  Edit
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
  const [showShareToast, setShowShareToast] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p60 FHD');

  // Subs Simulation
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Viewer donation modal and states
  const [showDonation, setShowDonation] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<number>(50);
  const [tipMessage, setTipMessage] = useState('');
  const [donationStatus, setDonationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Guest invitation states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');

  // Floating Hearts Local States
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);

  // Comments Visibility State (Abrir/Fechar comentários)
  const [isCommentsClosed, setIsCommentsClosed] = useState(false);

  // Gamified & live interactive donation states
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [activeDonationAlert, setActiveDonationAlert] = useState<{ userName: string; profilePic: string; amount: number; message: string } | null>(null);
  const [lastProcessedDonationId, setLastProcessedDonationId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'ranking'>('chat');
  const [showGoalConfig, setShowGoalConfig] = useState(false);
  const [goalTargetInput, setGoalTargetInput] = useState<number>(1000);
  const [goalDescInput, setGoalDescInput] = useState<string>('Comprar Microfone Profissional 🎙️');

  // WebRTC Live Peer Stream States
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [webrtcStatus, setWebrtcStatus] = useState<'idle' | 'offering' | 'connecting' | 'connected' | 'failed'>('idle');

  // Guest WebRTC states
  const [guestCameraStream, setGuestCameraStream] = useState<MediaStream | null>(null);
  const [guestRemoteStream, setGuestRemoteStream] = useState<MediaStream | null>(null);
  const [guestWebrtcStatus, setGuestWebrtcStatus] = useState<'idle' | 'offering' | 'connecting' | 'connected' | 'failed'>('idle');

  const isHost = post ? post.userId === currentUser.id : false;
  const isCurrentGuest = post ? (post.liveStream?.guestId === currentUser.id && post.liveStream?.guestStatus === 'active') : false;

  // Refs for video elements & auto-scrolling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const simVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const prevHeartsRef = useRef(0);

  // Ref for Guest WebRTC connections
  const guestPeerConnectionsRef = useRef<{ [viewerId: string]: RTCPeerConnection }>({});
  const guestProcessedTimestampsRef = useRef<{ [viewerId: string]: number }>({});
  const guestViewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // ZEGO Cloud Refs
  const zegoContainerRef = useRef<HTMLDivElement | null>(null);
  const zegoInstanceRef = useRef<any>(null);

  const getsZegoConfig = () => {
    const envAppId = import.meta.env.VITE_ZEGO_APP_ID;
    const envSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;
    
    // Safety Fallback test App ID and Server Secret for out-of-the-box streaming demo/sandbox test
    const appId = envAppId ? Number(envAppId) : 1083925039; 
    const serverSecret = envSecret || "077bd5dfbfb7fd6864fe786c666579df";
    
    return { appId, serverSecret };
  };

  useEffect(() => {
    let active = true;
    
    const initZego = async () => {
      if (!post || post.liveStream?.status !== 'LIVE') return;
      if (!zegoContainerRef.current) return;
      
      const { appId, serverSecret } = getsZegoConfig();
      const roomID = postId;
      const userID = currentUser.id;
      const userName = currentUser.firstName + " " + (currentUser.lastName || "");
      
      try {
        console.log("Setting up ZEGO Cloud Live Stream. RoomID:", roomID, "UserID:", userID, "IsHost:", isHost);
        
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appId,
          serverSecret,
          roomID,
          userID,
          userName
        );
        
        if (!active) return;
        
        if (zegoInstanceRef.current) {
          try {
            zegoInstanceRef.current.destroy();
          } catch (_) {}
          zegoInstanceRef.current = null;
        }

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        if (!active) return;
        zegoInstanceRef.current = zp;
        
        zp.joinRoom({
          container: zegoContainerRef.current,
          scenario: {
            mode: (ZegoUIKitPrebuilt as any).ScenarioLiveStreaming,
            config: {
              role: isHost 
                ? (ZegoUIKitPrebuilt as any).Host 
                : (isCurrentGuest 
                    ? (ZegoUIKitPrebuilt as any).Cohost 
                    : (ZegoUIKitPrebuilt as any).Audience),
            },
          },
          showUserList: false,
          showMyChat: false,
          showRoomDetails: false,
          showInviteButton: false,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: isHost,
          turnOnCameraWhenJoining: isHost || isCurrentGuest,
          turnOnMicrophoneWhenJoining: isHost || isCurrentGuest,
          onLeaveRoom: () => {
            console.log("Left ZEGO stream room successfully");
          }
        } as any);

        if (isHost || isCurrentGuest) {
          setCameraStream({
            getTracks: () => [],
            getVideoTracks: () => [],
            getAudioTracks: () => [],
          } as any);
        } else {
          setRemoteStream({} as any);
          setWebrtcStatus('connected');
        }
      } catch (err) {
        console.error("Failed to initialize ZEGO live streaming:", err);
      }
    };

    if (post?.liveStream?.status === 'LIVE') {
      const timer = setTimeout(() => {
        if (active) {
          initZego();
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        active = false;
        if (zegoInstanceRef.current) {
          try {
            zegoInstanceRef.current.destroy();
          } catch (e) {
            console.log("Error destroying ZEGO instance:", e);
          }
          zegoInstanceRef.current = null;
        }
      };
    }
  }, [post?.liveStream?.status, isHost, isCurrentGuest, postId, currentUser.id]);

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
    if (creatorProfile?.id && currentUser?.id) {
      const isFollowing = currentUser.followedUsers?.includes(creatorProfile.id);
      const isSub = isFollowing || localStorage.getItem(`subscribed_${creatorProfile.id}`) === 'true';
      setIsSubscribed(!!isSub);
    }
  }, [creatorProfile?.id, currentUser?.id, currentUser?.followedUsers]);

  // Load registered users who are available for invitations
  useEffect(() => {
    if (isHost) {
      getUsers(currentUser).then((users) => {
        setAllUsers((users || []).filter(u => u.id !== currentUser.id && u.id !== 'system'));
      }).catch(err => {
        console.error("Error loading modifiable participants catalog:", err);
      });
    }
  }, [isHost, currentUser]);

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
    if (isHost && post?.liveStream?.status === 'LIVE') {
      initiateBroadcasterStream();
    }
    return () => {
      stopBroadcasterStream();
    };
  }, [isHost, post?.liveStream?.status]);

  // 5b. Host: Bind active camera stream to video element when rendered
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

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

  // Synchronise simulated and remote video states
  useEffect(() => {
    if (simVideoRef.current) {
      simVideoRef.current.muted = videoMuted;
      simVideoRef.current.volume = videoVolume / 100;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = videoMuted;
      remoteVideoRef.current.volume = videoVolume / 100;
    }
  }, [videoMuted, videoVolume]);

  // WebRTC peer connections storage ref
  const peerConnectionsRef = useRef<{ [viewerId: string]: RTCPeerConnection }>({});
  const processedTimestampsRef = useRef<{ [viewerId: string]: number }>({});
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Sync Remote WebRTC video element srcObject
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // --- WebRTC Host/Broadcaster Session handler ---
  useEffect(() => {
    if (!isHost || !post || !post.webrtc_requests || !cameraStream || !db) return;
    return; // ZEGO handles all sessions and participants
    
    const handleRequests = async () => {
      const requests = post?.webrtc_requests || {};
      for (const viewerId of Object.keys(requests)) {
        const req = requests[viewerId];
        if (req && req.status === 'offer_ready') {
          const lastProcessedTime = processedTimestampsRef.current[viewerId] || 0;
          const reqTimestamp = req.timestamp || 0;

          if (reqTimestamp > lastProcessedTime) {
            const existingPc = peerConnectionsRef.current[viewerId];
            if (existingPc) {
              try {
                existingPc.close();
              } catch (e) {}
              delete peerConnectionsRef.current[viewerId];
            }
            processedTimestampsRef.current[viewerId] = reqTimestamp;
          }

          let pc = peerConnectionsRef.current[viewerId];
          if (!pc) {
            try {
              console.log(`Establishing WebRTC Broadcaster track channel for Viewer: ${viewerId}`);
              pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
              });
              peerConnectionsRef.current[viewerId] = pc;

              // Bind camera/mic tracks to peer channel
              cameraStream?.getTracks().forEach(track => {
                pc.addTrack(track, cameraStream!);
              });

              // Apply remote offer
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: req.viewerSdp }));

              // Create matching SDP response
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              const postRef = doc(db as any, 'posts', postId);
              await updateDoc(postRef, {
                [`webrtc_requests.${viewerId}.status`]: 'answer_ready',
                [`webrtc_requests.${viewerId}.hostSdp`]: answer.sdp,
                [`webrtc_requests.${viewerId}.hostCandidates`]: []
              });

              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  updateDoc(postRef, {
                    [`webrtc_requests.${viewerId}.hostCandidates`]: arrayUnion(JSON.stringify(event.candidate))
                  }).catch(e => console.error("Error adding host candidate:", e));
                }
              };

            } catch (err) {
              console.error(`Error answering WebRTC request for ${viewerId}:`, err);
            }
          }

          // Apply candidate list if connection is active and has viewerCandidates
          if (pc && req.viewerCandidates && Array.isArray(req.viewerCandidates)) {
            req.viewerCandidates.forEach((candidateStr: string) => {
              try {
                const candidateObj = JSON.parse(candidateStr);
                pc.addIceCandidate(new RTCIceCandidate(candidateObj)).catch(() => {});
              } catch (e) {}
            });
          }
        }
      }
    };
    
    handleRequests();
  }, [post, isHost, cameraStream, postId]);

  // --- WebRTC Viewer Side Session Caller ---
  useEffect(() => {
    return; // ZEGO handles all client-side rendering and connectivity
    if (isHost || !postId || post?.liveStream?.status === 'ENDED' || webrtcStatus !== 'idle' || !db) return;

    const startViewerWebRTC = async () => {
      try {
        console.log("Viewer side: Initiating WebRTC request to stream host web cam");
        setWebrtcStatus('offering');
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        viewerPeerConnectionRef.current = pc;

        // Force incoming media streams
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            console.log("WebRTC stream received successfully!");
            setRemoteStream(event.streams[0]);
            setWebrtcStatus('connected');
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            console.warn("WebRTC ICE Connection Failed");
            setWebrtcStatus('failed');
          }
        };

        const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        const postRef = doc(db as any, 'posts', postId);
        await updateDoc(postRef, {
          [`webrtc_requests.${currentUser.id}`]: {
            status: 'offer_ready',
            viewerSdp: offer.sdp,
            viewerCandidates: [],
            timestamp: Date.now()
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            updateDoc(postRef, {
              [`webrtc_requests.${currentUser.id}.viewerCandidates`]: arrayUnion(JSON.stringify(event.candidate))
            }).catch(e => console.error("Error adding viewer candidate:", e));
          }
        };

      } catch (err) {
        console.error("Error setting up Viewer WebRTC channel:", err);
        setWebrtcStatus('failed');
      }
    };

    startViewerWebRTC();

    return () => {
      if (viewerPeerConnectionRef.current) {
        viewerPeerConnectionRef.current.close();
        viewerPeerConnectionRef.current = null;
      }
      if (db && postId) {
        const postRef = doc(db as any, 'posts', postId);
        updateDoc(postRef, {
          [`webrtc_requests.${currentUser.id}`]: null
        }).catch(err => console.error("Error cleaning up WebRTC request:", err));
      }
      setRemoteStream(null);
      setWebrtcStatus('idle');
    };
  }, [postId, isHost, post?.liveStream?.status, db]);

  // Listener for Viewer to register Host's Answer SDP and candidates
  useEffect(() => {
    if (isHost || !post || !post.webrtc_requests?.[currentUser.id] || !db) return;
    const req = post.webrtc_requests[currentUser.id];
    const pc = viewerPeerConnectionRef.current;
    if (!pc) return;

    if (req.status === 'answer_ready' && pc.signalingState === 'have-local-offer') {
      const setRemoteDesc = async () => {
        try {
          console.log("Setting host answer as remote description...");
          setWebrtcStatus('connecting');
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: req.hostSdp }));
        } catch (err) {
          console.error("Error setting remote answer info:", err);
          setWebrtcStatus('failed');
        }
      };
      setRemoteDesc();
    }

    if (req.hostCandidates && Array.isArray(req.hostCandidates)) {
      req.hostCandidates.forEach((candidateStr: string) => {
        try {
          const candidateObj = JSON.parse(candidateStr);
          pc.addIceCandidate(new RTCIceCandidate(candidateObj)).catch(() => {});
        } catch (e) {}
      });
    }
  }, [post, isHost]);

  // --- Guest camera acquisition and release ---
  const initiateGuestBroadcasterStream = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1285, height: 725 },
          audio: true
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }
      setGuestCameraStream(stream);
    } catch (err) {
      console.error("Could not acquire Guest media stream:", err);
    }
  };

  const stopGuestBroadcasterStream = () => {
    if (guestCameraStream) {
      guestCameraStream.getTracks().forEach(track => track.stop());
      setGuestCameraStream(null);
    }
  };

  useEffect(() => {
    const isActiveGuest = post?.liveStream?.guestId === currentUser.id && post?.liveStream?.guestStatus === 'active';
    if (isActiveGuest) {
      if (!guestCameraStream) {
        initiateGuestBroadcasterStream();
      }
    } else {
      if (guestCameraStream) {
        stopGuestBroadcasterStream();
      }
    }
    return () => {
      if (guestCameraStream) {
        guestCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [post?.liveStream?.guestId, post?.liveStream?.guestStatus]);

  // --- WebRTC Guest Broadcaster signaling receiver listener (runs on active Guest) ---
  useEffect(() => {
    const isCurrentGuest = post?.liveStream?.guestId === currentUser.id && post?.liveStream?.guestStatus === 'active';
    if (!isCurrentGuest || !post || !post.webrtc_requests || !guestCameraStream || !db) return;
    return; // ZEGO handles multi-participation seamlessly

    const handleGuestRequests = async () => {
      const requests = post?.webrtc_requests || {};
      const postRef = doc(db as any, 'posts', postId);

      for (const key of Object.keys(requests)) {
        if (!key.endsWith('_guest')) continue;
        const viewerId = key.replace('_guest', '');
        if (viewerId === currentUser.id) continue; // Skip self requests
        
        const req = requests[key];
        
        if (req && req.status === 'offer_ready') {
          const lastProcessedTime = guestProcessedTimestampsRef.current[viewerId] || 0;
          const reqTimestamp = req.timestamp || 0;

          if (reqTimestamp > lastProcessedTime) {
            const existingPc = guestPeerConnectionsRef.current[viewerId];
            if (existingPc) {
              try { existingPc.close(); } catch (e) {}
              delete guestPeerConnectionsRef.current[viewerId];
            }
            guestProcessedTimestampsRef.current[viewerId] = reqTimestamp;
          }

          let pc = guestPeerConnectionsRef.current[viewerId];
          if (!pc) {
            try {
              console.log(`Establishing WebRTC Guest track channel for Viewer: ${viewerId}`);
              pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
              });
              guestPeerConnectionsRef.current[viewerId] = pc;

              // Bind Guest tracks
              guestCameraStream?.getTracks().forEach(track => {
                pc.addTrack(track, guestCameraStream!);
              });

              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: req.viewerSdp }));

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await updateDoc(postRef, {
                [`webrtc_requests.${key}.status`]: 'answer_ready',
                [`webrtc_requests.${key}.hostSdp`]: answer.sdp,
                [`webrtc_requests.${key}.hostCandidates`]: []
              });

              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  updateDoc(postRef, {
                    [`webrtc_requests.${key}.hostCandidates`]: arrayUnion(JSON.stringify(event.candidate))
                  }).catch(e => console.error("Error adding guest host candidate:", e));
                }
              };

            } catch (err) {
              console.error(`Error answering WebRTC request from guest broadcaster to ${viewerId}:`, err);
            }
          }

          if (pc && req.viewerCandidates && Array.isArray(req.viewerCandidates)) {
            req.viewerCandidates.forEach((candidateStr: string) => {
              try {
                const candidateObj = JSON.parse(candidateStr);
                pc.addIceCandidate(new RTCIceCandidate(candidateObj)).catch(() => {});
              } catch (e) {}
            });
          }
        }
      }
    };

    handleGuestRequests();
  }, [post, guestCameraStream, postId, db]);

  // --- WebRTC Guest Stream Receiver/Viewer side (runs on Host and other Viewers) ---
  useEffect(() => {
    return; // ZEGO handles all participants in one single streamlined feed container
    const isCurrentGuest = post?.liveStream?.guestId === currentUser.id;
    const isGuestActive = post?.liveStream?.guestStatus === 'active' && post?.liveStream?.guestId;
    if (isCurrentGuest || !postId || !isGuestActive || guestWebrtcStatus !== 'idle' || !db) return;

    const startGuestWebRTC = async () => {
      try {
        console.log("Setting up Viewer side to receive Guest Webcam...");
        setGuestWebrtcStatus('offering');
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        guestViewerPeerConnectionRef.current = pc;

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            console.log("Guest WebRTC stream received successfully!");
            setGuestRemoteStream(event.streams[0]);
            setGuestWebrtcStatus('connected');
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            setGuestWebrtcStatus('failed');
          }
        };

        const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        const postRef = doc(db as any, 'posts', postId);
        await updateDoc(postRef, {
          [`webrtc_requests.${currentUser.id}_guest`]: {
            status: 'offer_ready',
            viewerSdp: offer.sdp,
            viewerCandidates: [],
            timestamp: Date.now()
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            updateDoc(postRef, {
              [`webrtc_requests.${currentUser.id}_guest.viewerCandidates`]: arrayUnion(JSON.stringify(event.candidate))
            }).catch(e => console.error("Error adding guest viewer candidate:", e));
          }
        };

      } catch (err) {
        console.error("Error establishing Guest WebRTC receptor channel:", err);
        setGuestWebrtcStatus('failed');
      }
    };

    startGuestWebRTC();

    return () => {
      if (guestViewerPeerConnectionRef.current) {
        guestViewerPeerConnectionRef.current.close();
        guestViewerPeerConnectionRef.current = null;
      }
      if (db && postId) {
        const postRef = doc(db as any, 'posts', postId);
        updateDoc(postRef, {
          [`webrtc_requests.${currentUser.id}_guest`]: null
        }).catch(err => console.error("Error cleaning up Guest WebRTC channel:", err));
      }
      setGuestRemoteStream(null);
      setGuestWebrtcStatus('idle');
    };
  }, [postId, post?.liveStream?.guestStatus, post?.liveStream?.guestId, db, guestWebrtcStatus]);

  // Listener for Host/Viewer to register Guest's Answer SDP and candidates
  useEffect(() => {
    const isCurrentGuest = post?.liveStream?.guestId === currentUser.id;
    if (isCurrentGuest || !post || !post.webrtc_requests?.[currentUser.id + '_guest'] || !db) return;
    const req = post.webrtc_requests[currentUser.id + '_guest'];
    const pc = guestViewerPeerConnectionRef.current;
    if (!pc) return;

    if (req.status === 'answer_ready' && pc.signalingState === 'have-local-offer') {
      const setGuestRemoteDesc = async () => {
        try {
          console.log("Setting guest answer description...");
          setGuestWebrtcStatus('connecting');
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: req.hostSdp }));
        } catch (err) {
          console.error("Error applying guest remote answer Sdp:", err);
          setGuestWebrtcStatus('failed');
        }
      };
      setGuestRemoteDesc();
    }

    if (req.hostCandidates && Array.isArray(req.hostCandidates)) {
      req.hostCandidates.forEach((candidateStr: string) => {
        try {
          const candidateObj = JSON.parse(candidateStr);
          pc.addIceCandidate(new RTCIceCandidate(candidateObj)).catch(() => {});
        } catch (e) {}
      });
    }
  }, [post, isHost]);

  const initiateBroadcasterStream = async () => {
    // ZEGO handles video capture and streaming natively! We don't want constraints/locks conflicts.
    console.log("ZEGO is handling the active stream broadcasting capture natively.");
    setCameraStream({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    } as any);
  };

  const stopBroadcasterStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
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

  // Subscribe state toggle (with following database integration)
  const handleSubscribeToggle = async () => {
    if (!creatorProfile?.id || !currentUser?.id) return;
    const val = !isSubscribed;
    setIsSubscribed(val);
    localStorage.setItem(`subscribed_${creatorProfile.id}`, String(val));
    try {
      await toggleFollowUser(currentUser.id, creatorProfile.id);
      if (typeof refreshUser === 'function') {
        refreshUser();
      }
      // Immediately fetch creator profile updates so follower count is real and live!
      const updatedProfile = await findUserById(creatorProfile.id);
      if (updatedProfile) {
        setCreatorProfile(updatedProfile);
      }
    } catch (e) {
      console.error("Error toggling follow status on db:", e);
    }
  };

  // --- Co-Hosting / Multi-participant guest actions ---
  const handleSendInvite = async (user: User) => {
    if (!post || !db) return;
    try {
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.invitedGuestId': user.id,
        'liveStream.invitedGuestName': `${user.firstName} ${user.lastName}`.trim(),
        'liveStream.guestStatus': 'invited'
      });
      
      const systemNotice: Comment = {
        id: 'invite_sys_' + Date.now(),
        userId: 'system',
        userName: 'Sistema',
        profilePic: '',
        text: `📢 O anfitrião convidou @${user.firstName} para participar na live! Aguardando resposta...`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };
      await sendLiveMessage(postId, systemNotice);
      setShowInviteModal(false);
    } catch (err) {
      console.error("Failed to send invite:", err);
    }
  };

  const handleCancelInvite = async () => {
    if (!post || !db) return;
    try {
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.invitedGuestId': null,
        'liveStream.invitedGuestName': null,
        'liveStream.guestStatus': 'none'
      });

      const systemNotice: Comment = {
        id: 'invite_cancel_sys_' + Date.now(),
        userId: 'system',
        userName: 'Sistema',
        profilePic: '',
        text: `⚠️ O convite para co-apresentação foi cancelado pelo anfitrião.`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };
      await sendLiveMessage(postId, systemNotice);
    } catch (err) {
      console.error("Failed to cancel invite:", err);
    }
  };

  const handleRemoveCoHost = async () => {
    if (!post || !db) return;
    try {
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.invitedGuestId': null,
        'liveStream.invitedGuestName': null,
        'liveStream.guestId': null,
        'liveStream.guestName': null,
        'liveStream.guestStatus': 'none'
      });

      const systemNotice: Comment = {
        id: 'cohost_remove_sys_' + Date.now(),
        userId: 'system',
        userName: 'Sistema',
        profilePic: '',
        text: `🚪 Co-Apresentador desconectado pelo anfitrião.`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };
      await sendLiveMessage(postId, systemNotice);
    } catch (err) {
      console.error("Failed to remove co-host:", err);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!post || !db) return;
    try {
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.guestId': currentUser.id,
        'liveStream.guestName': `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        'liveStream.guestStatus': 'active'
      });

      const systemNotice: Comment = {
        id: 'cohost_accept_sys_' + Date.now(),
        userId: 'system',
        userName: 'Sistema',
        profilePic: '',
        text: `🎉 ${currentUser.firstName} aceitou o convite e subiu ao palco!`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };
      await sendLiveMessage(postId, systemNotice);
    } catch (err) {
      console.error("Error accepting invitation:", err);
    }
  };

  const handleRejectInvitation = async () => {
    if (!post || !db) return;
    try {
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.invitedGuestId': null,
        'liveStream.invitedGuestName': null,
        'liveStream.guestStatus': 'none'
      });

      const systemNotice: Comment = {
        id: 'cohost_reject_sys_' + Date.now(),
        userId: 'system',
        userName: 'Sistema',
        profilePic: '',
        text: `⚠️ @${currentUser.firstName} recusou o convite para co-apresentar no momento.`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };
      await sendLiveMessage(postId, systemNotice);
    } catch (err) {
      console.error("Error rejecting invitation:", err);
    }
  };

  const handleLeaveCallAsGuest = async () => {
    if (!post || !db) return;
    try {
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.invitedGuestId': null,
        'liveStream.invitedGuestName': null,
        'liveStream.guestId': null,
        'liveStream.guestName': null,
        'liveStream.guestStatus': 'none'
      });

      const systemNotice: Comment = {
        id: 'cohost_leave_sys_' + Date.now(),
        userId: 'system',
        userName: 'Sistema',
        profilePic: '',
        text: `🚪 ${currentUser.firstName} saiu da videoconferência da live.`,
        timestamp: Date.now(),
        replies: [],
        isAnonymous: false
      };
      await sendLiveMessage(postId, systemNotice);
    } catch (err) {
      console.error("Error leaving live as guest:", err);
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

  // Web Audio Synth Coin sound
  const playLiveCoinSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.25);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
        gain2.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.35);
      }, 70);
    } catch (e) {
      console.log("Synth audio failed/blocked:", e);
    }
  };

  // Listens to live comments changes to trigger dynamic donation alerts
  useEffect(() => {
    if (liveComments.length > 0) {
      const lastComment = liveComments[liveComments.length - 1];
      const isSystem = lastComment.userId === 'system' || lastComment.userId?.startsWith('system_');
      const isSuperChat = isSystem && lastComment.text.includes('SUPER CHAT');
      
      if (isSuperChat && lastComment.id !== lastProcessedDonationId) {
        setLastProcessedDonationId(lastComment.id);
        
        // Parse coins amount
        const coinsWord = lastComment.text.match(/(\d+)\s+FaceCoins/);
        const amount = coinsWord ? parseInt(coinsWord[1], 10) : 50;
        
        // Extract message inside quotes
        const msgMatch = lastComment.text.match(/"([^"]+)"/);
        const message = msgMatch ? msgMatch[1] : '';

        // Play Synthesized sound
        playLiveCoinSound();

        // Spawn visual flying hearts
        for (let i = 0; i < 8; i++) {
          setTimeout(spawnLocalHeart, i * 80);
        }

        // Set donation overlay message
        setActiveDonationAlert({
          userName: lastComment.userName,
          profilePic: lastComment.profilePic || '',
          amount,
          message
        });

        // Hide alert box automatically after 6 seconds
        const timer = setTimeout(() => {
          setActiveDonationAlert(null);
        }, 6000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [liveComments, lastProcessedDonationId]);

  // Dynamically group donations from comments
  const getLeaderboard = () => {
    const contributors: Record<string, { id: string; userName: string; profilePic: string; totalAmount: number }> = {};
    
    liveComments.forEach(c => {
      const isSystem = c.userId === 'system' || c.userId?.startsWith('system_');
      const isSuperChat = isSystem && c.text.includes('SUPER CHAT');
      
      if (isSuperChat) {
        // Derive real user ID
        const realUserId = c.userId.startsWith('system_') ? c.userId.replace('system_', '') : c.userName;
        const coinsWord = c.text.match(/(\d+)\s+FaceCoins/);
        const amount = coinsWord ? parseInt(coinsWord[1], 10) : 50;

        if (contributors[realUserId]) {
          contributors[realUserId].totalAmount += amount;
        } else {
          contributors[realUserId] = {
            id: realUserId,
            userName: c.userName,
            profilePic: c.profilePic || '',
            totalAmount: amount
          };
        }
      }
    });

    // Convert to list and sort descending
    return Object.values(contributors).sort((a, b) => b.totalAmount - a.totalAmount);
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

      // Increment donation progress current
      const postRef = doc(db as any, 'posts', postId);
      await updateDoc(postRef, {
        'liveStream.donationCurrent': (post.liveStream?.donationCurrent || 0) + selectedDonation
      });

      // 2. Post a system notifier comment on the live chat representing Super Chat
      const systemMessage: Comment = {
        id: 'spec_donation_' + Date.now(),
        userId: 'system_' + currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        profilePic: currentUser.profilePicture || '',
        text: `💰 SUPER CHAT: Apoiou o criador com ${selectedDonation} FaceCoins!${tipMessage ? ` "${tipMessage.trim()}"` : ''} 🎉`,
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
      setTipMessage('');
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
          recordingUrl: 'https://vjs.zencdn.net/v/oceans.mp4' 
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

  // Get Subscribers / Seguidores text
  const getSubscribersText = () => {
    if (!creatorProfile) return "0 seguidores";
    const realCount = creatorProfile.followers?.length || 0;
    return `${realCount} ${realCount === 1 ? 'seguidor' : 'seguidores'}`;
  };

  if (!postId) {
    return (
      <div className="min-h-[100dvh] bg-[#0c0f17] flex flex-col items-center justify-center text-center p-6 text-white pb-24 font-sans">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <X className="h-8 w-8" />
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
            <span className="text-[10px] font-black text-red-500 bg-red-950/20 border border-red-500/20 px-3.5 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Painel do Produtor
            </span>
          </div>
        )}
      </header>

      {/* 2. Main content Grid container */}
      <div className="flex-1 w-full max-w-[1780px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 overflow-y-auto lg:overflow-hidden h-[calc(100vh-56px)]">
        
        {/* LEFT COLUMN: video element & title and descriptions (collapsible) */}
        <main className={`col-span-12 ${isCinemaMode ? 'lg:col-span-12' : isCommentsClosed ? 'lg:col-span-12' : 'lg:col-span-9'} flex flex-col h-full overflow-y-auto pr-0 lg:pr-1 pb-32 scrollbar-none`}>
          
          {isEnded ? (
            /* Live Stream is finished layout */
            <div className="aspect-[4/3] xs:aspect-[1.5] sm:aspect-video w-full max-w-4xl mx-auto bg-zinc-950 rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-zinc-800 shadow-2xl">
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center mb-5 text-zinc-500 shadow-2xl">
                <VideoCameraSlashIcon className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">Transmissão Encerrada</h1>
              <p className="text-zinc-400 text-xs mt-1 uppercase font-bold tracking-wider">A transmissão ao vivo foi encerrada pelo apresentador.</p>
              
              <div className="grid grid-cols-2 gap-6 w-full max-w-sm bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/60 my-6">
                <div>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Espectadores Totais</p>
                  <p className="text-xl font-black mt-1 text-white">{viewerCount}</p>
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
              <div 
                onClick={() => {
                  if (!isHost && remoteStream && videoMuted) {
                    setVideoMuted(false);
                  }
                }}
                className={`relative aspect-[4/3] xs:aspect-[1.5] sm:aspect-video w-full bg-black rounded-2xl overflow-hidden border border-zinc-800/60 shadow-xl group/player ${!isHost && remoteStream && videoMuted ? 'cursor-pointer' : ''}`}
              >
                
                {post.liveStream?.status === 'LIVE' ? (
                  /* 1. ZEGO Cloud Video Streaming container */
                  <div ref={zegoContainerRef} className="w-full h-full relative bg-zinc-950" />
                ) : (
                  /* 2. Fully Polished Studio Live Standby/Loading Overlay (NO placeholder cartoon videos!) */
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-[#121214] to-zinc-950 text-center p-6 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06),transparent_70%)] animate-pulse" />
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-red-650/15 blur-xl rounded-full scale-110 animate-pulse duration-1000" />
                      <img 
                        src={creatorProfile?.profilePicture || '/default-avatar.png'} 
                        alt="Streamer" 
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-red-600 shadow-2xl relative z-10 animate-pulse" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 z-20 bg-red-650 text-[9px] font-black uppercase text-white px-2 py-0.5 rounded-full border border-zinc-900 shadow-md">
                        OFFLINE
                      </div>
                    </div>
                    <p className="text-sm font-black text-white uppercase tracking-wider relative z-10">
                      {creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : 'Canal do Criador'}
                     </p>
                     <p className="text-[10px] sm:text-xs text-zinc-400 font-bold tracking-widest mt-1.5 uppercase relative z-10 max-w-[320px]">
                       {isHost 
                         ? "Permita o acesso à câmera para iniciar a transmissão..." 
                         : "Aguardando sinal ao vivo do transmissor..."
                       }
                     </p>
                    <div className="mt-4 flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 relative z-10">
                      <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />
                      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Sem Sinal de Vídeo</span>
                    </div>
                  </div>
                )}

                {/* 4. Active Live Donation Alert Slider (Displays in video frame overlay) */}
                <AnimatePresence>
                  {activeDonationAlert && (
                    <motion.div
                      initial={{ opacity: 0, y: -80, scale: 0.9 }}
                      animate={{ opacity: 1, y: 16, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm bg-gradient-to-r from-amber-505 via-yellow-500 to-amber-600 rounded-2xl p-4 shadow-2xl border border-amber-300/30 flex items-center gap-3 text-left overflow-hidden pointer-events-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine pointer-events-none" />
                      
                      <img 
                        src={activeDonationAlert.profilePic || '/default-avatar.png'} 
                        alt="Donor avatar" 
                        className="w-10 h-10 rounded-full object-cover border-2 border-zinc-950 shadow-md shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-zinc-950 uppercase tracking-tight truncate">
                            {activeDonationAlert.userName}
                          </span>
                          <span className="text-[8px] bg-zinc-950 text-amber-500 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                            SUPORTE
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-950 font-black uppercase tracking-wider mt-0.5">
                          Apoiou o canal com <span className="text-zinc-950 font-mono text-xs">{activeDonationAlert.amount}</span> Coins! 🌟
                        </p>
                        {activeDonationAlert.message && (
                          <p className="text-[11px] font-bold text-white bg-black/20 px-2 py-1 rounded-md mt-1 italic truncate">
                            "{activeDonationAlert.message}"
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Blinking Live Badge on screen */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10">
                  <div className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                  <span className="text-[9px] font-black text-white tracking-wider uppercase">AO VIVO</span>
                  {!isHost && webrtcStatus === 'connected' && remoteStream && (
                    <>
                      <span className="text-zinc-400 text-[10px] font-bold shrink-0">|</span>
                      <span className="text-[9px] font-black text-emerald-400 tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                        <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                        Webcam Real
                      </span>
                    </>
                  )}
                  {!isHost && webrtcStatus === 'connecting' && (
                    <>
                      <span className="text-zinc-400 text-[10px] font-bold shrink-0">|</span>
                      <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                        <span className="h-2 w-2 bg-amber-500 rounded-full" />
                        Sintonizando Canal...
                      </span>
                    </>
                  )}
                  {!isHost && webrtcStatus === 'offering' && (
                    <>
                      <span className="text-zinc-400 text-[10px] font-bold shrink-0">|</span>
                      <span className="text-[9px] font-black text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                        <span className="h-2 w-2 bg-zinc-500 rounded-full" />
                        Conectando...
                      </span>
                    </>
                  )}
                  <span className="text-zinc-400 text-[10px] font-bold shrink-0">|</span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-zinc-100">
                    <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>{viewerCount}</span>
                  </div>
                </div>

                {/* Host specific hardware HUD inside the player */}
                {isHost && cameraStream && (
                  <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-650/40 text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    <span>TRANSMISSÃO ACTIVA</span>
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

                {/* Floating click to unmute helper banner */}
                {!isHost && remoteStream && videoMuted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoMuted(false);
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-35 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase px-4.5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-red-500 animate-bounce cursor-pointer tracking-wider"
                  >
                    <VolumeX className="h-4 w-4 shrink-0 animate-pulse" />
                    <span>Clique para Activar Som</span>
                  </button>
                )}

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

                    {/* Subscription / Follow Button (Hidden for host) */}
                    {!isHost && (
                      <button 
                        onClick={handleSubscribeToggle}
                        className={`ml-3.5 px-4.5 py-2 text-xs font-black uppercase rounded-full tracking-wider transition-all duration-200 active:scale-95 shrink-0 ${isSubscribed ? 'bg-zinc-850 text-zinc-400 hover:bg-zinc-800 border border-zinc-800' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                      >
                        {isSubscribed ? 'Seguindo' : 'Seguir'}
                      </button>
                    )}
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

                    {/* Dynamic Co-hosting buttons */}
                    {isHost && (
                      <>
                        {post.liveStream?.guestStatus === 'active' ? (
                          <button 
                            type="button" 
                            onClick={handleRemoveCoHost}
                            className="flex items-center gap-1.5 bg-red-650/45 hover:bg-red-600 border border-red-500/30 text-white font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider duration-150 active:scale-95 shrink-0"
                            title="Remover co-apresentador do palco"
                          >
                            <Users className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            <span>Remover Participante</span>
                          </button>
                        ) : post.liveStream?.guestStatus === 'invited' ? (
                          <button 
                            type="button"
                            onClick={handleCancelInvite}
                            className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-[#0f0f0f] border border-amber-500/35 text-amber-400 font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider duration-150 active:scale-95 shrink-0"
                            title="Cancelar convite enviado"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                            <span>Pendente: {post.liveStream?.invitedGuestName}</span>
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider duration-150 active:scale-95 shrink-0"
                            title="Convidar alguém para participar da live dividindo a tela"
                          >
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span>Convidar Participante</span>
                          </button>
                        )}
                      </>
                    )}

                    {!isHost && post.liveStream?.guestId === currentUser.id && post.liveStream?.guestStatus === 'active' && (
                      <button 
                        type="button"
                        onClick={handleLeaveCallAsGuest}
                        className="flex items-center gap-1.5 bg-red-650 hover:bg-red-600 text-white font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider duration-150 active:scale-95 shrink-0"
                        title="Sair do palco da transmissão ao vivo"
                      >
                        <span>Sair da Chamada</span>
                      </button>
                    )}

                    {/* Share Simulation Pill */}
                    <button 
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(`${window.location.origin}/#/live/${postId}`);
                        } catch (e) {}
                        setShowShareToast(true);
                        setTimeout(() => setShowShareToast(false), 2200);
                      }}
                      className="flex items-center gap-1.5 bg-[#272727] hover:bg-[#3f3f3f] text-white font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider transition-all active:scale-95 border border-zinc-800 shrink-0"
                    >
                      <Share2 className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                      <span>Compartilhar</span>
                    </button>

                    {/* Toggle Comments Panel Button */}
                    <button 
                      onClick={() => setIsCommentsClosed(!isCommentsClosed)}
                      className={`flex items-center gap-1.5 font-black text-xs uppercase px-4 py-2.5 rounded-full tracking-wider transition-all active:scale-95 border shrink-0 ${isCommentsClosed ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white animate-pulse shadow-md shadow-red-600/20' : 'bg-[#272727] hover:bg-[#3f3f3f] border-zinc-800 text-white'}`}
                      title={isCommentsClosed ? "Abrir Comentários" : "Fechar Comentários"}
                    >
                      <Send className="h-3.5 w-3.5 shrink-0 rotate-[-45deg] text-zinc-300" />
                      <span>{isCommentsClosed ? 'Abrir Comentários' : 'Fechar Comentários'}</span>
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
                      <span className="text-red-500 font-extrabold">{viewerCount} assistindo</span>
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

        {/* RIGHT COLUMN Placeholder when Chat is Closed */}
        {!isEnded && isCommentsClosed && (
          <aside className="hidden lg:flex lg:col-span-1 flex-col items-center justify-start pt-2 shrink-0 h-full">
            <button
              onClick={() => setIsCommentsClosed(false)}
              className="w-full py-8 bg-zinc-900/60 hover:bg-zinc-805 border border-zinc-800 rounded-2xl flex flex-col items-center gap-4 text-zinc-400 hover:text-white transition-all duration-300 hover:border-zinc-700/80 select-none shadow-xl group border-dashed cursor-pointer"
              title="Abrir Comentários"
            >
              <Send className="h-4 w-4 rotate-[-45deg] group-hover:scale-110 duration-200 text-red-500" />
              <span className="font-black text-[9px] uppercase tracking-widest [writing-mode:vertical-lr] shrink-0 pointer-events-none">
                Ver Comentários
              </span>
            </button>
          </aside>
        )}

        {/* RIGHT COLUMN: Live Chat Sidebar (independent scroll bar window) */}
        {!isEnded && !isCommentsClosed && (
          <aside className={`col-span-12 ${isCinemaMode ? 'lg:col-span-12 mt-4' : 'lg:col-span-3'} flex flex-col bg-[#181818] rounded-xl border border-zinc-800 overflow-hidden h-[500px] lg:h-[calc(100vh-100px)] min-h-[400px] shrink-0`}>
            
            {/* Live Chat Header with tab controls */}
            <div className="border-b border-zinc-800 bg-[#1f1f1f] flex flex-col shrink-0">
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-650 animate-ping shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest truncate">Live Interactiva</span>
                </div>
                <button 
                  onClick={() => setIsCommentsClosed(true)}
                  className="p-1 px-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-400 rounded-md transition-all text-[9.5px] font-black uppercase tracking-wider shrink-0"
                  title="Fechar Painel"
                >
                  Ocultar
                </button>
              </div>

              {/* Tabs buttons row */}
              <div className="grid grid-cols-2 border-t border-zinc-800/80">
                <button 
                  onClick={() => setSidebarTab('chat')}
                  className={`py-2 px-1 text-[10px] font-black uppercase tracking-widest transition-all truncate ${sidebarTab === 'chat' ? 'bg-[#181818] text-white border-b-2 border-red-650' : 'bg-[#1f1f1f] text-zinc-500 hover:text-zinc-300'}`}
                >
                  💬 Chat ao Vivo
                </button>
                <button 
                  onClick={() => setSidebarTab('ranking')}
                  className={`py-2 px-1 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 shrink-0 truncate ${sidebarTab === 'ranking' ? 'bg-[#181818] text-white border-b-2 border-red-650' : 'bg-[#1f1f1f] text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>Doadores 🏆</span>
                </button>
              </div>
            </div>

            {/* Donation Goal sticky block inside Sidebar */}
            <div className="bg-[#1a1a1c] border-b border-zinc-800/80 p-3 flex flex-col gap-2 shrink-0 text-left">
              <div className="flex justify-between items-center bg-[#1a1a1c]">
                <div className="flex items-center gap-1.5 text-amber-400 bg-[#1a1a1c]">
                  <Target className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Meta de Apoio</span>
                </div>
                {/* Edit meta for stream host */}
                {isHost && (
                  <button 
                    onClick={() => {
                      setGoalTargetInput(post.liveStream?.donationGoal || 1000);
                      setGoalDescInput(post.liveStream?.donationGoalMsg || 'Comprar Microfone Profissional 🎙️');
                      setShowGoalConfig(true);
                    }}
                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                    title="Configurar Meta de Doação"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Progress bar and statistics */}
              {(() => {
                const goal = post.liveStream?.donationGoal || 1000;
                const current = post.liveStream?.donationCurrent || 0;
                const pct = Math.min(100, Math.round((current / goal) * 100));
                const msg = post.liveStream?.donationGoalMsg || 'Comprar Novo Equipamento para o Canal';
                
                return (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-zinc-300 font-bold uppercase truncate tracking-wide" title={msg}>
                      🎯 {msg}
                    </p>
                    
                    {/* The Bar */}
                    <div className="w-full bg-zinc-800 h-3.5 rounded-full overflow-hidden relative border border-zinc-700/30">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-extrabold text-white uppercase tracking-widest mix-blend-difference drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {pct}% Completo
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                      <span>{current} Coins</span>
                      <span>Alvo: {goal} Coins</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {sidebarTab === 'ranking' ? (
              /* Leaderboard ranking list tab */
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="text-center py-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">TOP APOIADORES DA LIVE 👑</h4>
                </div>
                {getLeaderboard().length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-5 mt-10">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-3 text-amber-500">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-white">Sem Doações Ainda</h5>
                    <p className="text-[9px] text-zinc-400 mt-1 max-w-[200px] leading-relaxed">Seja o primeiro a apoiar o canal! Clique no botão de apoio abaixo.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {getLeaderboard().map((backer, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      const isTop3 = idx < 3;
                      
                      return (
                        <div 
                          key={backer.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            idx === 0 
                              ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/5' 
                              : idx === 1 
                                ? 'bg-zinc-850/60 border-zinc-800' 
                                : idx === 2 
                                  ? 'bg-amber-600/5 border-amber-600/20' 
                                  : 'bg-[#1f1f1f] border-zinc-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Ranking position / Medal */}
                            <span className={`text-[11px] font-black ${isTop3 ? 'text-lg' : 'text-zinc-500 font-mono w-4 text-center'}`}>
                              {medal}
                            </span>
                            <img 
                              src={backer.profilePic || '/default-avatar.png'} 
                              alt={backer.userName} 
                              className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0" 
                            />
                            <div className="text-left min-w-0 leading-tight">
                              <p className="text-xs font-black text-white truncate max-w-[110px]">
                                {backer.userName}
                              </p>
                              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#a8a8a8]">
                                Contribuinte
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-amber-400 font-mono flex items-center gap-1 select-none">
                              💰 {backer.totalAmount}
                            </span>
                            <p className="text-[7.5px] uppercase font-black tracking-widest text-zinc-500 mt-0.5">FaceCoins</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Comments List flow container (Chat tab) */
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
                    const isSystem = c.userId === 'system' || c.userId?.startsWith('system_');
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
            )}

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
                <h3 className="text-base font-black uppercase text-white tracking-tight flex items-center gap-1.5 animate-pulse">
                  <DollarSign className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Apoiar Canal (FaceTube Super Chat)</span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Saldo em conta: {currentUser.balance || 0} FaceCoins</span>
                  <button
                    type="button"
                    onClick={() => setIsWalletModalOpen(true)}
                    className="text-[9px] bg-[#d32f2f]/30 text-[#ef5350] hover:bg-red-600 hover:text-white px-2 py-0.5 rounded-full transition-colors border border-red-500/30 uppercase font-black tracking-wider shrink-0"
                  >
                    + Recarregar
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowDonation(false)}
                disabled={donationStatus === 'processing'}
                className="p-2 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all"
              >
                <X className="h-4.5 w-4.5" />
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
                <div>
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block mb-2 text-left">Selecione o valor do Apoio</label>
                  <div className="grid grid-cols-4 gap-2 text-left">
                    {[20, 50, 100, 200, 500, 1000, 2000, 5000].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setSelectedDonation(amount)}
                        disabled={donationStatus === 'processing'}
                        className={`py-2 rounded-xl border flex flex-col items-center gap-0.5 transition-all text-center ${selectedDonation === amount ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-transparent border-zinc-c6 shadow-inner border-zinc-850 hover:border-zinc-700 text-zinc-350'}`}
                      >
                        <span className="text-[11px] font-black text-amber-400">{amount}</span>
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest">Coins</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tip Message input */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Mensagem da Gorjeta (Opcional)</label>
                  <input 
                    type="text"
                    value={tipMessage}
                    onChange={e => setTipMessage(e.target.value)}
                    placeholder="Escreva uma mensagem especial de apoio..."
                    maxLength={100}
                    disabled={donationStatus === 'processing'}
                    className="w-full bg-[#272727] hover:bg-[#333333] focus:ring-1 focus:ring-amber-500 border border-transparent rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 outline-none transition-all font-medium"
                  />
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

      {/* Share Toast Notification Banner */}
      {showShareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-white font-bold text-xs uppercase px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 tracking-wider z-50 animate-bounce duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>✓ Link da Live copiado! Compartilhe com os amigos</span>
        </div>
      )}

      {/* Host: Select and invite registered user to co-host */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#181818] border border-zinc-800 rounded-2xl p-6 relative flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center text-left">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <VideoCameraIcon className="h-4.5 w-4.5 text-sky-400" />
                  <span>Convidar Participante</span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">O convidado dividirá a tela ao vivo no YouTube</p>
              </div>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Filter textbox */}
            <input 
              type="text"
              value={inviteSearch}
              onChange={e => setInviteSearch(e.target.value)}
              placeholder="Pesquisar participantes por nome..."
              className="w-full bg-[#272727] hover:bg-[#333333] focus:ring-1 focus:ring-sky-500 border border-transparent rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 outline-none transition-all font-medium"
            />

            {/* Filtered Users List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {allUsers
                .filter(u => {
                  const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                  return fullName.includes(inviteSearch.toLowerCase());
                })
                .length === 0 ? (
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center py-6">Nenhum membro encontrado</p>
                ) : (
                  allUsers
                    .filter(u => {
                      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                      return fullName.includes(inviteSearch.toLowerCase());
                    })
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-750 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={u.profilePicture || '/default-avatar.png'} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full object-cover border border-zinc-700" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left min-w-0">
                            <p className="text-xs font-black text-white truncate max-w-[150px]">{u.firstName} {u.lastName}</p>
                            <p className="text-[9px] font-mono text-zinc-500 truncate">@{u.id.substring(0, 8)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSendInvite(u)}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95"
                        >
                          Convidar
                        </button>
                      </div>
                    ))
                )}
            </div>

          </div>
        </div>
      )}

      {/* Guest: Animated push notification dialog overlay asking to join the streaming feed */}
      {!isHost && post?.liveStream?.invitedGuestId === currentUser.id && post?.liveStream?.guestStatus === 'invited' && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#1b2230] border border-sky-500/35 rounded-2xl p-5 shadow-2xl shadow-sky-500/10 animate-bounce flex flex-col gap-3.5 text-left">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
              <VideoCameraIcon className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white uppercase tracking-wider">Convite ao Vivo</p>
              <p className="text-[10px] text-zinc-300 font-medium mt-1 leading-relaxed">
                O host te convidou para participar da transmissão e aparecer na mesma janela ao vivo! Deseja conectar sua câmera e mic?
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleRejectInvitation}
              className="px-4 py-2 bg-zinc-905 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={handleAcceptInvitation}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg animate-pulse"
            >
              Aceitar e Transmitir
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Recharge Wallet popup directly within livestream preview */}
      {isWalletModalOpen && (
        <WalletModal 
          isOpen={isWalletModalOpen} 
          mode="deposit" 
          onClose={() => setIsWalletModalOpen(false)} 
          currentUser={currentUser} 
          refreshUser={async () => {
            await refreshUser();
          }} 
        />
      )}

      {/* 4. Host Donation Goal Configurer Modal */}
      {showGoalConfig && (
        <div 
          className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 text-[#bfbfbf]"
          onClick={() => setShowGoalConfig(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#1e1e1e] border border-zinc-800 rounded-3xl p-6 relative flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center text-left">
              <div className="flex items-center gap-2 bg-[#1e1e1e]">
                <Target className="h-5 w-5 text-amber-400 shrink-0" />
                <h4 className="font-extrabold uppercase tracking-tight text-white text-sm">Definir Meta da Live</h4>
              </div>
              <button 
                onClick={() => setShowGoalConfig(false)}
                className="p-1 px-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-colors"
              >
                Fechar
              </button>
            </div>

            <p className="text-[10px] text-zinc-400 uppercase tracking-wider leading-relaxed text-left">
              Estabeleça uma meta de moedas para que todos os espectadores apoiem a live em tempo real!
            </p>

            <div className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Meta (Coins Alvo)</label>
                <input 
                  type="number"
                  min={100}
                  step={100}
                  value={goalTargetInput}
                  onChange={e => setGoalTargetInput(Number(e.target.value))}
                  className="w-full bg-[#2a2a2a] border border-zinc-800 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a8a8]">Descrição da Meta</label>
                <input 
                  type="text"
                  maxLength={50}
                  value={goalDescInput}
                  placeholder="Ex: Microfone Novo, Teclado Mecânico"
                  onChange={e => setGoalDescInput(e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-800 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-xs text-white outline-none font-medium"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const postRef = doc(db as any, 'posts', postId);
                    await updateDoc(postRef, {
                      'liveStream.donationGoal': Number(goalTargetInput),
                      'liveStream.donationGoalMsg': goalDescInput || 'Meta do Canal'
                    });
                    setShowGoalConfig(false);
                  } catch (err) {
                    console.error("Error setting goal:", err);
                  }
                }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-lg text-center"
              >
                Guardar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveStreamViewer;
