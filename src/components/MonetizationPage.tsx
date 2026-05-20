import React from 'react';
import { User, UserType } from '../types';
import { 
  CurrencyDollarIcon, 
  RocketLaunchIcon, 
  CheckCircleIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid';

interface MonetizationPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => Promise<void>;
}

const MonetizationPage: React.FC<MonetizationPageProps> = ({ currentUser, onNavigate }) => {
  const isMonetized = currentUser.isMonetized || currentUser.userType === UserType.CREATOR;
  
  const requirements = [
    { label: 'Seguidores', current: currentUser.followers?.length || 0, target: 1000, icon: StarIcon },
    { label: 'Vídeos Publicados', current: 0, target: 5, icon: VideoCameraIcon },
    { label: 'Engajamento Global', current: 'A registrar', target: 'Alta', icon: RocketLaunchIcon }
  ];

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 bg-white dark:bg-[#0a0c10]">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <CurrencyDollarIcon className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Programa de Criadores</span>
           </div>
           <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
             Ganhe com seu <br /><span className="text-emerald-600 italic">talento</span>.
           </h2>
        </header>

        {isMonetized ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-2 bg-emerald-600 p-8 rounded-[3rem] text-white space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="flex justify-between items-start relative z-10">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200 mb-2">Saldo Monetizável</p>
                      <h3 className="text-5xl font-black">${(currentUser.balance || 0).toFixed(2)}</h3>
                   </div>
                   <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                      <RocketLaunchIcon className="h-8 w-8" />
                   </div>
                </div>
                <div className="flex gap-4 relative z-10">
                   <button className="px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Sacar agora</button>
                   <button className="px-8 py-4 bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Ver Detalhes</button>
                </div>
             </div>
             
             <div className="bg-gray-900 p-8 rounded-[3rem] text-white space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Destaques</h4>
                <div className="space-y-4">
                   <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Dicas de Fãs</span>
                      <span className="font-black text-sm">$0.00</span>
                   </div>
                   <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Ads Revenue</span>
                      <span className="font-black text-sm">$0.00</span>
                   </div>
                   <div className="flex items-center justify-between py-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Vendas Afiliadas</span>
                      <span className="font-black text-sm">$0.00</span>
                   </div>
                </div>
                <button onClick={() => onNavigate('chat')} className="w-full py-4 border-2 border-emerald-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all">Suporte Criador</button>
             </div>
          </div>
        ) : (
          <div className="space-y-8">
             <div className="bg-gray-50 dark:bg-white/5 p-10 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10 text-center">
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-4">Você ainda não é monetizado</h3>
                <p className="text-gray-500 font-medium text-sm max-w-md mx-auto mb-8 leading-relaxed">Crie conteúdo autêntico angolano, acumule seguidores e desbloqueie o poder de ganhar com sua criatividade no FacePhone.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                   {requirements.map((req, i) => (
                     <div key={i} className="bg-white dark:bg-black/20 p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                        <req.icon className="h-6 w-6 text-emerald-600 mb-4" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{req.label}</p>
                        <div className="flex items-end justify-between">
                           <span className="text-lg font-black dark:text-white">{req.current}</span>
                           <span className="text-[10px] font-bold text-gray-400">Objetivo: {req.target}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                           <div className="h-full bg-emerald-600" style={{ width: typeof req.current === 'number' ? `${Math.min((req.current / (req.target as number)) * 100, 100)}%` : '0%' }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white flex flex-col justify-between h-64 group cursor-pointer overflow-hidden relative">
                   <div className="relative z-10">
                      <MusicalNoteIcon className="h-10 w-10 mb-4" />
                      <h4 className="text-2xl font-black uppercase tracking-tighter italic">Sounds Lab</h4>
                      <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Crie áudios originais e ganhe royalties</p>
                   </div>
                   <ArrowRightIcon className="h-6 w-6 relative z-10 group-hover:translate-x-2 transition-transform" />
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
                <div className="p-8 bg-purple-600 rounded-[2.5rem] text-white flex flex-col justify-between h-64 group cursor-pointer overflow-hidden relative">
                   <div className="relative z-10">
                      <StarIcon className="h-10 w-10 mb-4" />
                      <h4 className="text-2xl font-black uppercase tracking-tighter italic">Brand Deals</h4>
                      <p className="text-[10px] font-bold text-purple-100 uppercase tracking-widest mt-1">Conecte-se com marcas globais em Angola</p>
                   </div>
                   <ArrowRightIcon className="h-6 w-6 relative z-10 group-hover:translate-x-2 transition-transform" />
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default MonetizationPage;
