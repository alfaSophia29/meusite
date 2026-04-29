
import React, { useState, useRef, useEffect } from 'react';
import { Comment, User } from '../../types';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface LiveStreamChatProps {
  messages: Comment[];
  currentUser: User;
  onSendMessage: (text: string) => void;
}

const LiveStreamChat: React.FC<LiveStreamChatProps> = ({ messages, currentUser, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full pointer-events-auto">
      <div className="flex-1 overflow-y-auto no-scrollbar mask-gradient-chat pb-2">
        {messages.map(msg => (
          <div key={msg.id} className="flex items-start gap-2 animate-slide-right-fade mb-2">
            <div className={`px-3 py-1.5 rounded-2xl rounded-tl-none backdrop-blur-sm border shadow-sm text-xs max-w-full break-words 
              ${msg.isSuperChat 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                : msg.userId === currentUser.id 
                  ? 'bg-blue-600/40 border-blue-500/30' 
                  : 'bg-black/40 border-white/5'}`}>
              <div className="flex items-baseline justify-between gap-4 mb-0.5">
                <span className={`font-black mr-2 text-[10px] uppercase tracking-wide ${msg.isSuperChat ? 'text-white' : 'text-gray-300'}`}>
                  {msg.userName}
                </span>
                {msg.isSuperChat && (
                  <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded-md">
                    ${msg.superChatAmount}
                  </span>
                )}
              </div>
              <span className={`font-medium text-[11px] leading-snug ${msg.isSuperChat ? 'text-white drop-shadow-sm' : 'text-white'}`}>
                {msg.text}
              </span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-3 border border-white/10 focus-within:bg-white/20 transition-all shadow-lg min-w-0 mt-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Comente algo..." 
          className="bg-transparent border-none outline-none text-xs font-bold text-white placeholder-white/50 w-full min-w-0"
        />
        <button type="submit" disabled={!newMessage.trim()} className="text-white/80 hover:text-blue-400 transition-colors disabled:opacity-30 shrink-0">
          <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
        </button>
      </form>
    </div>
  );
};

export default LiveStreamChat;
