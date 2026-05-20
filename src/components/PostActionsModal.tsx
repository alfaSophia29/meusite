
import React from 'react';
import { 
  XMarkIcon, 
  BookmarkIcon, 
  LinkIcon, 
  TrashIcon, 
  NoSymbolIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  MapPinIcon,
  RocketLaunchIcon,
  CheckBadgeIcon,
  PresentationChartBarIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';
import { Post, User } from '../types';

interface PostActionsModalProps {
  isAuthor: boolean;
  isPinned: boolean;
  isFollowing?: boolean;
  isSaved?: boolean;
  isMonetized?: boolean;
  canMonetize?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onBoost?: () => void;
  onFollow?: () => void;
  onIndicate?: () => void;
  onReport?: () => void;
  onSave?: () => void;
  onToggleMonetization?: () => void;
}

const PostActionsModal: React.FC<PostActionsModalProps> = ({ 
  isAuthor,
  isPinned,
  isFollowing,
  isSaved,
  isMonetized,
  canMonetize,
  onClose,
  onEdit,
  onDelete,
  onPin,
  onBoost,
  onFollow,
  onIndicate,
  onReport,
  onSave,
  onToggleMonetization
}) => {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-darkcard w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-300">
        <div className="p-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Opções do Post</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto no-scrollbar">
          {onSave && (
            <button 
              onClick={() => { onSave(); onClose(); }}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-gray-700 dark:text-gray-200"
            >
              <BookmarkIcon className={`h-6 w-6 ${isSaved ? 'text-brand fill-current' : ''}`} />
              <span className="font-bold text-sm">{isSaved ? 'Remover dos Salvos' : 'Salvar Postagem'}</span>
            </button>
          )}

          {onEdit && isAuthor && (
            <button 
              onClick={onEdit}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-gray-700 dark:text-gray-200"
            >
              <PencilSquareIcon className="h-6 w-6 text-blue-500" />
              <span className="font-bold text-sm">Editar Postagem</span>
            </button>
          )}

          {onPin && isAuthor && (
            <button 
              onClick={onPin}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-gray-700 dark:text-gray-200"
            >
              <MapPinIcon className={`h-6 w-6 ${isPinned ? 'text-brand fill-current' : ''}`} />
              <span className="font-bold text-sm">{isPinned ? 'Desafixar do Perfil' : 'Fixar no Perfil'}</span>
            </button>
          )}

          {onBoost && (
            <button 
              onClick={onBoost}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-pink-500"
            >
              <RocketLaunchIcon className="h-6 w-6" />
              <span className="font-bold text-sm">Impulsionar Postagem</span>
            </button>
          )}

          {onToggleMonetization && canMonetize && isAuthor && (
            <button 
              onClick={onToggleMonetization}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-green-500"
            >
              <CurrencyDollarIcon className="h-6 w-6" />
              <span className="font-bold text-sm">{isMonetized ? 'Desativar Monetização' : 'Ativar Monetização'}</span>
            </button>
          )}

          {onIndicate && (
            <button 
              onClick={onIndicate}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-amber-500"
            >
              <CheckBadgeIcon className="h-6 w-6" />
              <span className="font-bold text-sm">Indicar esta Postagem</span>
            </button>
          )}

          {onFollow && !isAuthor && (
            <button 
              onClick={onFollow}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-gray-700 dark:text-gray-200"
            >
              {isFollowing ? <UserMinusIcon className="h-6 w-6" /> : <UserPlusIcon className="h-6 w-6" />}
              <span className="font-bold text-sm">{isFollowing ? 'Deixar de Seguir' : 'Seguir Usuário'}</span>
            </button>
          )}

          <button 
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Link copiado!');
              onClose();
            }}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all text-gray-700 dark:text-gray-200"
          >
            <LinkIcon className="h-6 w-6" />
            <span className="font-bold text-sm">Copiar Link</span>
          </button>

          {!isAuthor && onReport && (
            <button 
              onClick={onReport}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[1.5rem] transition-all text-red-500"
            >
              <ExclamationCircleIcon className="h-6 w-6" />
              <span className="font-bold text-sm">Denunciar</span>
            </button>
          )}

          {isAuthor && onDelete && (
            <button 
              onClick={onDelete}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[1.5rem] transition-all text-red-500"
            >
              <TrashIcon className="h-6 w-6" />
              <span className="font-bold text-sm">Excluir Postagem</span>
            </button>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-white/5">
            <button 
                onClick={onClose}
                className="w-full py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default PostActionsModal;
