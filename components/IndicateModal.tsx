
import React, { useState } from 'react';
import { User, Post } from '../types';
import { getUsers, indicatePostToUser, findUserById } from '../services/storageService';
import { XMarkIcon, PaperAirplaneIcon, MagnifyingGlassIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { useDialog } from '../services/DialogContext';

interface IndicateModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onPostUpdated: () => void;
}

const IndicateModal: React.FC<IndicateModalProps> = ({ post, currentUser, onClose, onPostUpdated }) => {
  const { showAlert } = useDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [followers, setFollowers] = useState<User[]>([]);

  React.useEffect(() => {
    const loadFollowers = async () => {
      const followedIds = currentUser.followedUsers || [];
      const loadedFollowers = await Promise.all(
        followedIds.map(id => findUserById(id))
      );
      
      const validFollowers = loadedFollowers.filter((u): u is User => u !== undefined && u !== null);
      
      setFollowers(validFollowers.filter(u => 
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    };
    loadFollowers();
  }, [currentUser.followedUsers, searchTerm]);

  const handleIndicate = async (targetUserId: string) => {
    const success = await indicatePostToUser(post.id, currentUser.id, targetUserId);
    if (success) {
      setIsSuccess(true);
      onPostUpdated();
      setTimeout(onClose, 1500);
    } else {
      showAlert('Você já indicou este conteúdo para este aluno.', { type: 'alert' });
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
       <div className="bg-white dark:bg-darkcard w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative border border-white/10 overflow-hidden">
          
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>

          {isSuccess ? (
             <div className="py-10 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                   <PaperAirplaneIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Conteúdo Indicado!</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Sua recomendação foi enviada.</p>
             </div>
          ) : (
             <>
                <div className="text-center mb-8">
                   <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckBadgeIcon className="h-8 w-8 text-blue-600" />
                   </div>
                   <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Indicar Aula</h3>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Recomende este conhecimento</p>
                </div>

                <div className="relative mb-6">
                   <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                   <input 
                     type="text" 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-xs" 
                     placeholder="Buscar aluno ou colega..." 
                   />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-1">
                   {followers.map(user => user && (
                     <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                        <div className="flex items-center gap-3">
                           <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-8 h-8 rounded-lg object-cover" />
                           <span className="font-black text-[10px] dark:text-white truncate max-w-[120px]">{user.firstName} {user.lastName}</span>
                        </div>
                        <button 
                          onClick={() => handleIndicate(user.id)}
                          className="p-2 bg-blue-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                        >
                           <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
                        </button>
                     </div>
                   ))}
                   {followers.length === 0 && <p className="text-center text-gray-400 text-[10px] font-bold py-6">Nenhum aluno encontrado.</p>}
                </div>

                <button 
                  onClick={onClose}
                  className="w-full mt-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                   Fechar
                </button>
             </>
          )}
       </div>
    </div>
  );
};

export default IndicateModal;
