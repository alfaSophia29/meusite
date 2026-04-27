
import React, { useState, useEffect, useMemo } from 'react';
import { User, ChatConversation, Page, ChatType, Post, PostType } from '../types';
import { getChats, shareToGroup, getUsers, addPost, generateUUID } from '../services/storageService';
import { 
  XMarkIcon, 
  LinkIcon, 
  PaperAirplaneIcon, 
  UserGroupIcon,
  ChatBubbleBottomCenterTextIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ShareIcon as ShareIconOutline
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ShareIcon as ShareIconSolid } from '@heroicons/react/24/solid';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  content: {
    title: string;
    text: string;
    url: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  };
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, currentUser, onNavigate, content }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharedTargets, setSharedTargets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareToFeedLoading, setShareToFeedLoading] = useState(false);
  const [feedShared, setFeedShared] = useState(false);
  const [storyShared, setStoryShared] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'followers'>('all');
  const [userComment, setUserComment] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      const [convs, users] = await Promise.all([
        getChats(currentUser.id),
        getUsers(currentUser)
      ]);
      setConversations(convs);
      setAllUsers(users);
      setLoading(false);
    };
    fetchData();
  }, [isOpen, currentUser.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(content.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToConversation = async (convId: string) => {
    if (sharedTargets.includes(convId)) return;
    
    let shareText = userComment ? `${userComment}\n\n` : '';
    shareText += `${content.title}\n${content.text}\n${content.url}`;
    
    await shareToGroup(
      convId, 
      currentUser.id, 
      shareText, 
      content.mediaType || 'text', 
      content.mediaUrl
    );
    
    setSharedTargets(prev => [...prev, convId]);
  };

  const handleShareToDirectUser = async (user: User) => {
    let existingConv = conversations.find(c => 
      c.type === ChatType.PRIVATE && 
      c.participants.includes(user.id)
    );

    let convId = '';
    if (existingConv) {
      convId = existingConv.id;
    } else {
      convId = `dm-${[currentUser.id, user.id].sort().join('-')}`;
    }

    if (sharedTargets.includes(convId)) return;

    let shareText = userComment ? `${userComment}\n\n` : '';
    shareText += `${content.title}\n${content.text}\n${content.url}`;

    await shareToGroup(
      convId, 
      currentUser.id, 
      shareText, 
      content.mediaType || 'text', 
      content.mediaUrl
    );
    
    setSharedTargets(prev => [...prev, convId]);
  };

  const handleShareToFeed = async () => {
    if (feedShared) return;
    setShareToFeedLoading(true);
    try {
      let finalContent = userComment ? `💬 ${userComment}\n\n` : '';
      finalContent += `🔝 COMPARTILHADO: ${content.title}\n\n${content.text}\n\n${content.url}`;

      const newPost: Post = {
        id: generateUUID(),
        userId: currentUser.id,
        authorName: `${currentUser.firstName} ${currentUser.lastName}`,
        authorProfilePic: currentUser.profilePicture,
        type: content.mediaType === 'image' ? PostType.IMAGE : PostType.TEXT,
        timestamp: Date.now(),
        content: finalContent,
        imageUrl: content.mediaUrl || '',
        likes: [],
        comments: [],
        shares: [],
        saves: [],
        tags: ['SHARED']
      };
      await addPost(newPost);
      setFeedShared(true);
    } catch (error) {
      console.error("Erro ao compartilhar no feed:", error);
    } finally {
      setShareToFeedLoading(false);
    }
  };

  const handleShareToStory = async () => {
    if (storyShared) return;
    try {
      // Simulação de adicionar aos stories
      setStoryShared(true);
    } catch (error) {
      console.error("Erro ao compartilhar no story:", error);
    }
  };

  const handleExternalShare = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'telegram') => {
    const encodedUrl = encodeURIComponent(content.url);
    const encodedText = encodeURIComponent(`${content.title}\n${content.text}`);
    
    let shareUrl = '';
    switch(platform) {
      case 'whatsapp': shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`; break;
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`; break;
      case 'telegram': shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`; break;
    }
    
    window.open(shareUrl, '_blank');
  };

  const followedGroups = useMemo(() => {
    return conversations.filter(c => 
      c.type === ChatType.GROUP && 
      c.participants.includes(currentUser.id)
    ).filter(c => !searchTerm || c.groupName?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [conversations, currentUser.id, searchTerm]);

  const followerContacts = useMemo(() => {
    const followers = allUsers.filter(u => currentUser.followers?.includes(u.id));
    return followers.filter(f => !searchTerm || `${f.firstName} ${f.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allUsers, currentUser.followers, searchTerm]);

  const allFilteredTargets = useMemo(() => {
    if (activeTab === 'groups') return followedGroups.map(g => ({ type: 'group', data: g }));
    if (activeTab === 'followers') return followerContacts.map(f => ({ type: 'user', data: f }));
    
    return [
      ...followedGroups.map(g => ({ type: 'group', data: g })),
      ...followerContacts.map(f => ({ type: 'user', data: f }))
    ];
  }, [activeTab, followedGroups, followerContacts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#0a0c10] w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up border border-white/5 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">Compartilhar</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-full transition-all">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          
          {/* Section: Post to Feed & Story */}
          <section className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <img 
                src={currentUser.profilePicture} 
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 p-0.5" 
                alt={currentUser.firstName}
              />
              <div>
                <p className="text-xs font-black dark:text-white leading-none">{currentUser.firstName} {currentUser.lastName}</p>
                <div className="flex gap-2 mt-1">
                  <button className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-md text-[8px] font-black uppercase text-gray-500 dark:text-gray-400">
                    <GlobeAltIcon className="h-2.5 w-2.5" />
                    Público
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                placeholder="Diga algo sobre isso..."
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                className="w-full bg-transparent outline-none resize-none text-sm font-medium dark:text-white placeholder:text-gray-400 min-h-[80px]"
              />

              {/* Content Preview */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 flex gap-4 border border-gray-100 dark:border-white/5 shadow-inner">
                {content.mediaUrl && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
                    <img src={content.mediaUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="flex-1 min-w-0 py-1">
                  <h4 className="text-xs font-black dark:text-white truncate uppercase tracking-tight">{content.title}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 leading-tight">{content.text}</p>
                  <p className="text-[9px] text-blue-500 font-bold mt-2 truncate">{content.url}</p>
                </div>
              </div>

              {/* Targets (Feed / Story) */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleShareToFeed}
                  disabled={feedShared || shareToFeedLoading}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${feedShared ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10'}`}
                >
                  <GlobeAltIcon className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-black uppercase">Seu Feed</span>
                  {feedShared && <CheckCircleIcon className="h-3 w-3 mt-1" />}
                </button>
                <button 
                  onClick={handleShareToStory}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${storyShared ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10'}`}
                >
                  <GlobeAltIcon className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-black uppercase">Sua História</span>
                  {storyShared && <CheckCircleIcon className="h-3 w-3 mt-1" />}
                </button>
              </div>

              <button 
                onClick={handleShareToFeed}
                disabled={shareToFeedLoading || (feedShared && storyShared)}
                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] ${feedShared && storyShared ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {shareToFeedLoading ? 'Publicando...' : (feedShared && storyShared ? 'Publicado!' : 'Publicar Agora')}
              </button>
            </div>
          </section>

          <div className="h-2 bg-gray-50 dark:bg-black/40"></div>

          {/* Social Icons Section */}
          <section className="p-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Compartilhar em outros apps</p>
            <div className="flex justify-between gap-4">
              {[
                { id: 'whatsapp', label: 'WhatsApp', color: 'bg-[#25D366]', icon: 'W' },
                { id: 'facebook', label: 'Facebook', color: 'bg-[#1877F2]', icon: 'F' },
                { id: 'twitter', label: 'X', color: 'bg-black', icon: 'X' },
                { id: 'telegram', label: 'Telegram', color: 'bg-[#0088cc]', icon: 'T' }
              ].map(social => (
                <button 
                  key={social.id}
                  onClick={() => handleExternalShare(social.id as any)}
                  className="flex flex-col items-center gap-2 flex-1 group"
                >
                  <div className={`w-12 h-12 ${social.color} rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md group-hover:scale-110 transition-all`}>
                    {social.icon}
                  </div>
                  <span className="text-[8px] font-bold text-gray-500 uppercase">{social.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="h-2 bg-gray-50 dark:bg-black/40"></div>

          {/* Targeted Sharing (Messenger style) */}
          <section className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enviar individualmente</p>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-blue-500/50 transition-all w-32"
                />
                <MagnifyingGlassIcon className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-1 p-1 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
              {[
                { id: 'all', label: 'Sugestões' },
                { id: 'followers', label: 'Seguidores' },
                { id: 'groups', label: 'Seus Grupos' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : allFilteredTargets.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                 <p className="text-[9px] font-black text-gray-400 uppercase">Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {allFilteredTargets.map((target, idx) => {
                  const isGroup = target.type === 'group';
                  const data = target.data as any;
                  const id = isGroup ? data.id : data.id;
                  const name = isGroup ? (data.groupName || 'Grupo') : `${data.firstName} ${data.lastName}`;
                  const image = isGroup ? (data.groupImage || 'https://picsum.photos/seed/group/100/100') : (data.profilePicture || 'https://picsum.photos/seed/user/100/100');
                  const targetId = isGroup ? id : `dm-${[currentUser.id, id].sort().join('-')}`;
                  const isShared = sharedTargets.includes(targetId);

                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group">
                      <div className="flex items-center gap-3">
                        <img src={image} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-white/10" referrerPolicy="no-referrer" />
                        <div className="text-left">
                          <p className="text-xs font-black dark:text-white uppercase tracking-tight">{name}</p>
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{isGroup ? 'Grupo que você segue' : 'Seguidor'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => isGroup ? handleShareToConversation(id) : handleShareToDirectUser(data)}
                        disabled={isShared}
                        className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase transition-all ${isShared ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 active:scale-95'}`}
                      >
                        {isShared ? 'Enviado' : 'Enviar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer Quick Actions */}
        <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex gap-2">
          <button 
            onClick={handleCopyLink}
            className="flex-1 py-3 bg-white dark:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:shadow-sm transition-all"
          >
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>
          <button 
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: content.title, text: content.text, url: content.url });
                } catch (err: any) {
                  if (err.name !== 'AbortError') console.error('Error sharing:', err);
                }
              } else {
                handleCopyLink();
              }
            }}
            className="flex-1 py-3 bg-white dark:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:shadow-sm transition-all"
          >
            Mais Opções
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
