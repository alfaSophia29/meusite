
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatConversation, Call, CallStatus } from '../types';
import { acceptCall, rejectCall, endCall, listenForCallStatus, timeoutCall } from '../services/callService';
import { PhoneIcon, VideoCameraIcon, XMarkIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';

interface CallModalProps {
  currentUser: User;
  partner: User | undefined;
  group: ChatConversation | undefined;
  type: 'video' | 'voice';
  callId: string | undefined;
  onClose: () => void;
  incomingCall?: Call;
}

const CallModal: React.FC<CallModalProps> = ({ currentUser, partner: initialPartner, group, type, callId, onClose, incomingCall }) => {
  const [status, setStatus] = useState<CallStatus>(incomingCall ? CallStatus.RINGING : CallStatus.RINGING);
  const statusRef = useRef<CallStatus>(status);
  const [partner, setPartner] = useState<User | undefined>(initialPartner);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!callId) return;

    const unsubscribe = listenForCallStatus(callId, (updatedCall) => {
      const prevStatus = statusRef.current;
      setStatus(updatedCall.status);
      
      if (!partner) {
        // If we don't have partner info, it means we are receiving.
      }

      if (updatedCall.status === CallStatus.ACCEPTED && duration === 0) {
        // Start duration timer
      }

      if (updatedCall.status === CallStatus.REJECTED || updatedCall.status === CallStatus.ENDED || updatedCall.status === CallStatus.TIMED_OUT || updatedCall.status === CallStatus.MISSED) {
        // If the call was still ringing (or just started), close immediately if it's ended/cancelled
        // This handles "caller hung up before receiver answered"
        if (prevStatus === CallStatus.RINGING) {
          onClose();
        } else {
          // If it was already active, show "Ended" for 2s
          setTimeout(onClose, 2000);
        }
      }
    }, (error) => {
      console.error("Call status listener error:", error);
      onClose();
    });

    // Ringing timeout (30 seconds)
    const timeout = setTimeout(() => {
      if (status === CallStatus.RINGING && callId) {
        timeoutCall(callId);
      }
    }, 30000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [callId]);

  useEffect(() => {
    if (status === CallStatus.ACCEPTED) {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  const handleAccept = async () => {
    if (callId) await acceptCall(callId);
  };

  const handleReject = async () => {
    if (callId) await rejectCall(callId);
    onClose();
  };

  const handleEnd = async () => {
    if (callId) await endCall(callId);
    onClose();
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const partnerName = incomingCall ? incomingCall.callerName : (partner ? `${partner.firstName} ${partner.lastName}` : 'Usuário');
  const partnerImage = incomingCall ? incomingCall.callerProfilePic : (partner ? partner.profilePicture : '');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white text-center"
    >
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mx-auto ring-4 ring-blue-600/20">
          <img src={partnerImage || 'https://via.placeholder.com/128'} alt={partnerName} className="w-full h-full object-cover" />
        </div>
        {status === CallStatus.RINGING && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-25" />
        )}
      </div>

      <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{partnerName}</h3>
      
      <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-8 animate-pulse">
        {status === CallStatus.RINGING ? (incomingCall ? 'Recebendo Chamada...' : 'Chamando...') : 
         status === CallStatus.ACCEPTED ? `Em Chamada • ${formatDuration(duration)}` :
         status === CallStatus.REJECTED ? 'Chamada Rejeitada' :
         status === CallStatus.ENDED ? 'Chamada Encerrada' :
         status === CallStatus.TIMED_OUT ? 'Sem Resposta' : 'Chamada'}
      </p>

      <div className="flex items-center gap-8 mt-4">
        {status === CallStatus.RINGING && incomingCall && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAccept}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/20"
          >
            {type === 'video' ? <VideoCameraIcon className="h-8 w-8" /> : <PhoneIcon className="h-8 w-8" />}
          </motion.button>
        )}

        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={status === CallStatus.RINGING && incomingCall ? handleReject : handleEnd}
          className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-600/20"
        >
          <PhoneXMarkIcon className="h-8 w-8" />
        </motion.button>
      </div>

      {status === CallStatus.ACCEPTED && type === 'video' && (
        <div className="mt-12 p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
           <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Vídeo Ativado</p>
           <p className="text-xs font-bold text-gray-400">O streaming de vídeo está sendo estabelecido via P2P...</p>
        </div>
      )}
    </motion.div>
  );
};

export default CallModal;
