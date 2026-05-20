import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { 
    MagnifyingGlassIcon, 
    ShoppingCartIcon, 
    BellIcon, 
    ArrowLeftIcon, 
    Bars3Icon,
    WalletIcon,
    FilmIcon
} from '@heroicons/react/24/outline';
import Logo from './Logo';

interface HeaderProps {
  currentUser: User | null;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  unreadNotificationsCount: number;
  cartItemCount: number;
  onOpenCart: () => void;
  onToggleMenu: () => void;
  onOpenWallet: (mode: 'deposit' | 'withdraw') => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onNavigate, 
  unreadNotificationsCount, 
  cartItemCount, 
  onOpenCart, 
  onToggleMenu,
  onOpenWallet 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('search-results', { query: searchQuery.trim() });
      setSearchQuery(''); 
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <>
      <header className="bg-white/90 dark:bg-darkbg/90 backdrop-blur-md shadow-sm px-3 md:px-6 py-2 md:py-4 flex justify-between items-center fixed top-0 left-0 w-full z-[100] border-b border-gray-100 dark:border-white/5 h-[64px] md:h-[72px]">
        <div className="flex items-center gap-1.5 md:gap-6">
          {currentUser && (
            <button 
              onClick={onToggleMenu}
              className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90 relative z-30 shadow-sm border border-gray-100 dark:border-white/5"
              aria-label="Menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}
          <div className="cursor-pointer relative z-20" onClick={() => onNavigate('feed')}>
            <Logo className="h-8 md:h-10" />
          </div>
        </div>

        {currentUser && (
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-sm mx-4 lg:mx-8 relative group">
            <div className="relative w-full text-gray-400 focus-within:text-brand transition-colors">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-4 py-2 border border-gray-100 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand text-sm transition-all shadow-inner dark:text-white"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        )}

        {currentUser ? (
          <div className="flex items-center gap-1 md:gap-3 lg:gap-4 flex-shrink-0">
            <button onClick={() => onNavigate('reels-page')} className="hidden sm:flex p-2 rounded-xl text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5" title="Reels">
              <FilmIcon className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <button onClick={() => onNavigate('wallet')} className="hidden min-[787px]:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-all border border-green-500/20">
              <WalletIcon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">Carteira</span>
            </button>

            <button onClick={() => setIsMobileSearchOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl">
              <MagnifyingGlassIcon className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            
            <button onClick={onOpenCart} className="p-2 rounded-xl text-gray-600 dark:text-gray-400 relative transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
              <ShoppingCartIcon className="h-5 w-5 md:h-6 md:w-6" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand text-white text-[8px] font-black rounded-full h-3 w-3 md:h-4 md:w-4 flex items-center justify-center border-2 border-white dark:border-darkbg">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button onClick={() => onNavigate('notifications')} className="p-2 rounded-xl text-gray-600 dark:text-gray-400 relative transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
              <BellIcon className="h-5 w-5 md:h-6 md:w-6" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black rounded-full h-3 w-3 md:h-4 md:w-4 flex items-center justify-center border-2 border-white dark:border-darkbg animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <div className="pl-1 border-l border-gray-100 dark:border-white/5 ml-1">
              <img
                src={currentUser.profilePicture || DEFAULT_PROFILE_PIC}
                alt="Profile"
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover cursor-pointer border-2 border-transparent hover:border-brand transition-all shadow-sm"
                onClick={() => onNavigate('profile')}
              />
            </div>
          </div>
        ) : (
          <button onClick={() => onNavigate('auth')} className="bg-brand hover:bg-brandHover text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Entrar</button>
        )}
      </header>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[110] bg-white dark:bg-darkbg animate-fade-in lg:hidden">
          <div className="flex items-center p-4 border-b border-gray-100 dark:border-white/5">
            <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 text-gray-500 dark:text-gray-400 mr-2">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input autoFocus type="text" placeholder="Buscar na FacePhone..." className="w-full bg-transparent text-base font-bold outline-none dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
