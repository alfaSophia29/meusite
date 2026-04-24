
import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { 
    MagnifyingGlassIcon, 
    ShoppingCartIcon, 
    BellIcon, 
    ArrowLeftIcon, 
    Bars3Icon 
} from '@heroicons/react/24/outline';
import Logo from './Logo';

interface HeaderProps {
  currentUser: User | null;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  unreadNotificationsCount: number;
  cartItemCount: number;
  onOpenCart: () => void;
  onToggleMenu: () => void;
  showInstallButton?: boolean;
  onInstallApp?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onNavigate, 
  unreadNotificationsCount, 
  cartItemCount, 
  onOpenCart, 
  onToggleMenu,
  showInstallButton,
  onInstallApp
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Detecta se é iOS para mostrar o botão sempre (pois no iOS o evento beforeinstallprompt não dispara)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const shouldShowInstall = showInstallButton || isIOS;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <div className="flex items-center gap-1 md:gap-2">
          {currentUser && (
            <button 
              onClick={onToggleMenu}
              className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all active:scale-90"
              aria-label="Menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}
          <div className="cursor-pointer" onClick={() => onNavigate('feed')}>
            <Logo size="md" />
          </div>
        </div>

        {currentUser && (
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-lg mx-8 relative group">
            <div className="relative w-full group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within/input:text-brand transition-colors text-gray-400">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="block w-full pl-11 pr-12 py-2.5 border-2 border-transparent rounded-full bg-gray-100/50 dark:bg-white/5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white dark:focus:bg-zinc-900 text-sm font-medium transition-all shadow-sm dark:text-white"
                placeholder="Pesquisar algo incrível..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-200/50 dark:bg-white/10 border dark:border-white/10 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  <span className="text-[12px]">⌘</span> K
                </div>
              </div>
            </div>
          </form>
        )}

        {currentUser ? (
          <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
            {shouldShowInstall && (
              <button 
                onClick={onInstallApp}
                className="flex items-center gap-1.5 bg-brand/10 hover:bg-brand/20 text-brand px-2.5 md:px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-tighter transition-all animate-pulse"
              >
                Instalar
              </button>
            )}
            <button onClick={() => setIsMobileSearchOpen(true)} className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full">
              <MagnifyingGlassIcon className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button onClick={onOpenCart} className="p-2 rounded-full text-gray-600 dark:text-gray-400 relative transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
              <ShoppingCartIcon className="h-5 w-5 md:h-6 md:w-6" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand text-white text-[8px] font-black rounded-full h-3 w-3 md:h-4 md:w-4 flex items-center justify-center border-2 border-white dark:border-darkbg">
                  {cartItemCount}
                </span>
              )}
            </button>
            <button onClick={() => onNavigate('notifications')} className="p-2 rounded-full text-gray-600 dark:text-gray-400 relative transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
              <BellIcon className="h-5 w-5 md:h-6 md:w-6" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black rounded-full h-3 w-3 md:h-4 md:w-4 flex items-center justify-center border-2 border-white dark:border-darkbg animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
            <img
              src={currentUser.profilePicture || DEFAULT_PROFILE_PIC}
              alt="Profile"
              className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover cursor-pointer border-2 border-transparent hover:border-brand transition-all shadow-sm ml-1"
              onClick={() => onNavigate('profile')}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <button onClick={() => onNavigate('auth')} className="bg-brand hover:bg-brandHover text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all">Entrar</button>
        )}
      </header>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[110] bg-white dark:bg-[#0a0a0a] animate-fade-in lg:hidden flex flex-col">
          <div className="flex items-center p-4 gap-4 border-b border-gray-100 dark:border-white/5 bg-white/90 dark:bg-black/90 backdrop-blur-xl">
            <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90">
              <ArrowLeftIcon className="h-6 w-6 dark:text-white" />
            </button>
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <div className="bg-gray-100 dark:bg-white/5 rounded-full px-4 py-2 flex items-center gap-3 border-2 border-transparent focus-within:border-brand transition-all overflow-hidden w-full">
                <MagnifyingGlassIcon className="h-5 w-5 text-brand shrink-0" />
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="O que você procura?" 
                  className="w-full bg-transparent text-[16px] font-medium outline-none border-none ring-0 focus:ring-0 focus:outline-none dark:text-white placeholder-gray-400 rounded-full py-1" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </form>
          </div>
          
          <div className="flex-1 p-6">
            <p className="text-[12px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mb-4">Buscas Recentes</p>
            <div className="flex flex-col gap-4 italic text-gray-500 dark:text-gray-400 text-sm">
                Ainda não há buscas recentes para exibir.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
