
import React from 'react';
import { 
  PencilSquareIcon, 
  TrashIcon, 
  RocketLaunchIcon, 
  MapPinIcon, 
  XMarkIcon,
  FlagIcon,
  UserPlusIcon,
  UserMinusIcon,
  ShareIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface PostActionsModalProps {
  isAuthor: boolean;
  isPinned: boolean;
  isFollowing?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onBoost: () => void;
  onFollow?: () => void;
  onIndicate?: () => void;
  onReport?: () => void;
  isMonetized?: boolean;
  onToggleMonetization?: () => void;
  canMonetize?: boolean;
}

const PostActionsModal: React.FC<PostActionsModalProps> = ({ 
  isAuthor, 
  isPinned, 
  isFollowing,
  onClose, 
  onEdit, 
  onDelete, 
  onPin, 
  onBoost,
  onFollow,
  onIndicate,
  onReport,
  isMonetized,
  onToggleMonetization,
  canMonetize
}) => {
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 animate-fade-in overflow-hidden">
      {/* Backdrop mais denso para focar no modal mini */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal Content - Ultra Compacto (max-w 240px) */}
      <div className="bg-white dark:bg-[#1a1c23] w-full max-w-[240px] rounded-[3.5rem] shadow-[0_40px_80px_-12px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden animate-scale-in relative z-10">
        <div className="p-3 flex flex-col gap-1">
          {isAuthor ? (
            <>
              {canMonetize && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleMonetization?.(); }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-[2rem] transition-all group ${isMonetized ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  <div className={`p-2 rounded-full group-hover:scale-110 transition-transform ${isMonetized ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-white/10'}`}>
                    <BanknotesIcon className="h-5 w-5" />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest">{isMonetized ? 'Monetizado' : 'Monetizar'}</span>
                </button>
              )}

              <button 
                onClick={(e) => { e.stopPropagation(); onBoost(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                  <RocketLaunchIcon className="h-5 w-5" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">Boost</span>
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                  <PencilSquareIcon className="h-5 w-5" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">Editar</span>
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onPin(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                  <MapPinIcon className={`h-5 w-5 ${isPinned ? 'text-blue-500' : ''}`} />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">
                  {isPinned ? 'Desafixar' : 'Fixar'}
                </span>
              </button>

              <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-4"></div>

              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full group-hover:scale-110 transition-transform">
                  <TrashIcon className="h-5 w-5" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">Eliminar</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onFollow?.(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                  {isFollowing ? <UserMinusIcon className="h-5 w-5" /> : <UserPlusIcon className="h-5 w-5" />}
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">
                  {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
                </span>
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onIndicate?.(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                  <ShareIcon className="h-5 w-5 text-blue-500" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">Indicar</span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onReport?.(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-[2rem] transition-all group"
              >
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
                  <FlagIcon className="h-5 w-5" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">Denunciar</span>
              </button>
            </>
          )}

          <button 
            onClick={onClose}
            className="mt-1 flex items-center justify-center w-full py-3.5 text-gray-400 hover:text-gray-900 dark:hover:text-white font-black text-[8px] uppercase tracking-[0.3em] transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostActionsModal;
