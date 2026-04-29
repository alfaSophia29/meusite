import React, { useState } from 'react';
import { User } from '../types';
import MonetizationDashboard from './MonetizationDashboard';
import PremiumCheckout from './PremiumCheckout';
import { 
  LockClosedIcon, 
  SparklesIcon,
  ShoppingBagIcon,
  PresentationChartLineIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface MonetizationPageProps {
  currentUser: User;
  onNavigate: (page: any) => void;
  refreshUser: () => Promise<void>;
}

const MonetizationPage: React.FC<MonetizationPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [view, setView] = useState<'selection' | 'creator' | 'premium'>('selection');

  const isMonetized = currentUser.monetizationStatus === 'APPROVED' || currentUser.isMonetized;

  if (view === 'creator') {
    return <MonetizationDashboard user={currentUser} onBack={() => setView('selection')} />;
  }

  if (view === 'premium') {
    return (
      <div className="relative">
        <button 
          onClick={() => setView('selection')}
          className="absolute top-4 left-4 p-3 bg-white dark:bg-darkcard rounded-2xl shadow-xl z-10 text-gray-500"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <PremiumCheckout 
          user={currentUser} 
          onSuccess={async () => {
            await refreshUser();
            setView('selection');
          }} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-black dark:text-white uppercase tracking-tighter">
          Monetização & <span className="text-brand">Premium</span>
        </h1>
        <p className="text-gray-500 font-medium max-w-2xl mx-auto">
          Escolha como você quer crescer no CyBerPhone. Ganhe dinheiro como criador ou melhore sua experiência com o Premium.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Creator Card */}
        <motion.div 
          whileHover={{ y: -8 }}
          onClick={() => setView('creator')}
          className="bg-white dark:bg-darkcard p-10 rounded-[3rem] border dark:border-white/10 shadow-xl cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <PresentationChartLineIcon className="h-32 w-32" />
          </div>
          
          <div className="h-16 w-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-8">
            <PresentationChartLineIcon className="h-10 w-10" />
          </div>

          <h2 className="text-3xl font-black dark:text-white mb-4">Portal do Criador</h2>
          <p className="text-gray-500 font-medium mb-8">
            Transforme sua paixão em receita. Acompanhe suas metas, ganhos de anúncios, super chats e muito mais.
          </p>

          <div className="flex items-center gap-2 text-brand font-black uppercase text-sm">
            {isMonetized ? 'Ver Dashboard' : 'Ver Requisitos'}
            <SparklesIcon className="h-5 w-5" />
          </div>
        </motion.div>

        {/* Premium Card */}
        <motion.div 
          whileHover={{ y: -8 }}
          onClick={() => setView('premium')}
          className="bg-gradient-to-br from-gray-900 to-black p-10 rounded-[3rem] shadow-xl cursor-pointer group relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBagIcon className="h-32 w-32" />
          </div>
          
          <div className="h-16 w-16 bg-white/10 text-brand rounded-2xl flex items-center justify-center mb-8">
            <SparklesIcon className="h-10 w-10 text-white" />
          </div>

          <h2 className="text-3xl font-black mb-4">Cyberphone Premium</h2>
          <p className="text-white/60 font-medium mb-8">
            Remova anúncios, assista offline e suporte seus criadores favoritos com sua visualização premium.
          </p>

          <div className="flex items-center gap-2 text-white font-black uppercase text-sm">
            {currentUser.isPremium ? 'Gerenciar Assinatura' : 'Assinar Agora'}
            <SparklesIcon className="h-5 w-5" />
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10">
        <h3 className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Como funciona a divisão?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-black text-brand mb-1">55%</p>
            <p className="text-xs font-bold text-gray-500 uppercase">Receita de Anúncios</p>
          </div>
          <div className="border-x dark:border-white/10">
            <p className="text-2xl font-black text-brand mb-1">70%</p>
            <p className="text-xs font-bold text-gray-500 uppercase">Super Chats</p>
          </div>
          <div>
            <p className="text-2xl font-black text-brand mb-1">80%</p>
            <p className="text-xs font-bold text-gray-500 uppercase">Membros de Nível 3</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonetizationPage;
