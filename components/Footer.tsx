
import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { 
    HomeIcon, 
    ChatBubbleLeftRightIcon, 
    UserCircleIcon, 
    BuildingStorefrontIcon, 
    FilmIcon,
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    MegaphoneIcon,
    CalendarDaysIcon,
    ShoppingBagIcon,
    PresentationChartLineIcon,
    RocketLaunchIcon,
    ShieldCheckIcon,
    XMarkIcon,
    BanknotesIcon,
    BookmarkIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';
import { 
    HomeIcon as HomeIconSolid, 
    ChatBubbleLeftRightIcon as ChatIconSolid, 
    UserCircleIcon as UserIconSolid, 
    BuildingStorefrontIcon as StoreIconSolid, 
    FilmIcon as FilmIconSolid,
    Cog6ToothIcon as CogIconSolid,
    MegaphoneIcon as MegaphoneIconSolid,
    CalendarDaysIcon as CalendarIconSolid,
    ShoppingBagIcon as ShoppingBagIconSolid,
    PresentationChartLineIcon as ChartIconSolid,
    RocketLaunchIcon as RocketIconSolid,
    ShieldCheckIcon as ShieldIconSolid,
    BanknotesIcon as BanknotesIconSolid,
    BookmarkIcon as BookmarkIconSolid,
    NoSymbolIcon as NoSymbolIconSolid
} from '@heroicons/react/24/solid';
import Logo from './Logo';

interface FooterProps {
  currentUser: User | null;
  onNavigate: (page: any) => void;
  activePage: string;
  onLogout: () => void;
  isMenuOpen: boolean;
  onCloseMenu: () => void;
  unreadMessagesCount: number;
}

const MOBILE_BOTTOM_PAGES = ['feed', 'reels-page', 'chat', 'store', 'profile'];

const Footer: React.FC<FooterProps> = ({ currentUser, onNavigate, activePage, onLogout, isMenuOpen, onCloseMenu, unreadMessagesCount }) => {
  const { t } = useTranslation();
  if (!currentUser) return null;

  const isProfessional = currentUser.isAdmin;

  const navSections = [
    { section: t('nav_explorar'), items: [
      { name: t('nav_feed'), page: 'feed', Icon: HomeIcon, SolidIcon: HomeIconSolid },
      { name: t('nav_reels'), page: 'reels-page', Icon: FilmIcon, SolidIcon: FilmIconSolid },
      { name: t('nav_events'), page: 'events', Icon: CalendarDaysIcon, SolidIcon: CalendarIconSolid },
      { name: t('nav_saved'), page: 'saved', Icon: BookmarkIcon, SolidIcon: BookmarkIconSolid },
    ]},
    { section: t('nav_conexoes'), items: [
      { name: t('nav_marketplace'), page: 'store', Icon: BuildingStorefrontIcon, SolidIcon: StoreIconSolid },
      { name: t('nav_purchases'), page: 'purchases', Icon: ShoppingBagIcon, SolidIcon: ShoppingBagIconSolid },
      { name: t('nav_affiliates'), page: 'affiliates', Icon: PresentationChartLineIcon, SolidIcon: ChartIconSolid },
    ]},
    { section: t('nav_business'), items: [
      { name: t('nav_monetization'), page: 'monetization', Icon: BanknotesIcon, SolidIcon: BanknotesIconSolid },
      { name: t('nav_ads'), page: 'ads', Icon: MegaphoneIcon, SolidIcon: MegaphoneIconSolid },
      { 
        name: t('nav_manage_store'), 
        page: 'manage-store', 
        Icon: RocketLaunchIcon, 
        SolidIcon: RocketIconSolid 
      }
    ]},
    { section: t('nav_conta'), items: [
      { name: t('nav_messages'), page: 'chat', Icon: ChatBubbleLeftRightIcon, SolidIcon: ChatIconSolid },
      { name: 'Bloqueados', page: 'blocked-users', Icon: NoSymbolIcon, SolidIcon: NoSymbolIconSolid },
      { name: t('nav_profile'), page: 'profile', Icon: UserCircleIcon, SolidIcon: UserIconSolid },
      { name: t('nav_settings'), page: 'settings', Icon: Cog6ToothIcon, SolidIcon: CogIconSolid },
    ]},
    ...(currentUser.isAdmin ? [{
      section: t('nav_admin'),
      items: [{ name: t('nav_root'), page: 'admin', Icon: ShieldCheckIcon, SolidIcon: ShieldIconSolid }]
    }] : [])
  ];

  const mobileBottomItems = [
    { page: 'feed', Icon: HomeIcon, Solid: HomeIconSolid },
    { page: 'reels-page', Icon: FilmIcon, Solid: FilmIconSolid },
    { page: 'chat', Icon: ChatBubbleLeftRightIcon, Solid: ChatIconSolid },
    { page: 'store', Icon: BuildingStorefrontIcon, Solid: StoreIconSolid },
    { page: 'profile', Icon: UserCircleIcon, Solid: UserIconSolid }
  ];

  const renderNavContent = (isMobileDrawer: boolean = false) => (
    <div className="space-y-8 flex-grow py-2">
      {navSections.map((section) => {
        const filteredItems = isMobileDrawer 
          ? section.items.filter(item => !MOBILE_BOTTOM_PAGES.includes(item.page))
          : section.items;

        if (filteredItems.length === 0) return null;

        return (
          <div key={section.section}>
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-4 ml-3">{section.section}</p>
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const isActive = activePage === item.page;
                const IconComponent = isActive ? item.SolidIcon : item.Icon;
                return (
                  <button
                    key={item.page}
                    onClick={() => { onNavigate(item.page); onCloseMenu(); }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-black text-[10px] transition-all duration-300 group relative ${
                      isActive ? 'bg-brand text-white shadow-xl' : 'text-gray-500 hover:bg-brand/5 dark:hover:bg-white/5 hover:text-brand'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="uppercase tracking-widest">{item.name}</span>
                    {item.page === 'chat' && unreadMessagesCount > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#0a0c10] animate-bounce">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
        <button onClick={onLogout} className="w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl font-black text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all uppercase tracking-widest">
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          {t('nav_logout')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 w-full z-[60] bg-white/95 dark:bg-[#111318]/95 backdrop-blur-xl border-t border-gray-100 dark:border-white/10 flex justify-around items-center h-16 md:hidden px-1 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
        {mobileBottomItems.map((item) => {
          // Lógica especial: Se estiver na página de gestão de loja, o ícone 'store' fica ativo
          const isActive = activePage === item.page || (item.page === 'store' && activePage === 'manage-store');
          const IconComponent = isActive ? item.Solid : item.Icon;
          return (
            <button key={item.page} onClick={() => onNavigate(item.page)} className={`flex-1 flex flex-col items-center justify-center transition-all relative ${isActive ? 'text-brand scale-125' : 'text-gray-400'}`}>
              <IconComponent className="h-6 w-6" />
              {item.page === 'chat' && unreadMessagesCount > 0 && (
                <span className="absolute top-0 right-1/4 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#111318]">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <aside className="hidden md:flex flex-col fixed left-0 top-[72px] w-64 h-[calc(100vh-72px)] bg-white dark:bg-[#0a0c10] border-r border-gray-100 dark:border-white/5 z-20 overflow-y-auto p-5 custom-scrollbar">
        {renderNavContent(false)}
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCloseMenu}></div>
          <div className="absolute inset-y-0 left-0 w-80 bg-white dark:bg-darkbg shadow-2xl flex flex-col animate-slide-right border-r border-gray-100 dark:border-white/5 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-white/5">
              <Logo size="md" />
              <button onClick={onCloseMenu} className="p-2 text-gray-400 active:scale-90 transition-transform">
                <XMarkIcon className="h-7 w-7" />
              </button>
            </div>
            {renderNavContent(true)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-right { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-slide-right { animation: slide-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </>
  );
};

export default Footer;
