
import React, { useState, useEffect } from 'react';
import { User, Call, CallType } from '../types';
import { listenForCalls } from '../services/callService';
import CallModal from './CallModal';

interface CallManagerProps {
  currentUser: User | null;
  activeCall: any | null;
  onIncomingCall: (call: Call) => void;
}

const CallManager: React.FC<CallManagerProps> = ({ currentUser, activeCall, onIncomingCall }) => {
  useEffect(() => {
    if (!currentUser || activeCall) return;

    const unsubscribe = listenForCalls(currentUser.id, (call) => {
      // Only trigger if it's ringing, we are the receiver, and we are not already in a call
      if (call.receiverId === currentUser.id && call.status === 'RINGING' && !activeCall) {
        onIncomingCall(call);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id, !!activeCall]);

  return null;
};

export default CallManager;
