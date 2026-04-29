import React, { useState, useEffect } from 'react';
import { User, EarningRecord } from '../types';
import { monetizationService } from '../services/monetizationService';
import { 
  UsersIcon, 
  ArrowUpRightIcon, 
  GiftIcon, 
  ShoppingBagIcon,
  LinkIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface AffiliatesPageProps {
  currentUser: User;
  onNavigate: (page: any) => void;
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({ currentUser, onNavigate }) => {
  const [copied, setCopied] = useState(false);
  const [affStats, setAffStats] = useState({
    clicks: 0,
    conversions: 0,
    earnings: 0
  });

  const referralLink = `${window.location.origin}/join?ref=${currentUser.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const loadAffiliateStats = async () => {
        const history = await monetizationService.getEarningsHistory(currentUser.id);
        const earningsTotal = history.reduce((sum, h) => sum + (h.totalDaily * 0.1), 0); // Simulated affiliate revenue
        
        setAffStats({
            clicks: Math.floor(earningsTotal * 45), 
            conversions: Math.floor(earningsTotal * 5),
            earnings: earningsTotal
        });
    };
    loadAffiliateStats();
  }, [currentUser.id]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Programa de Afiliados</h1>
            <p className="text-indigo-100 font-bold max-w-md text-lg">Indique novos usuários e ganhe 10% sobre cada assinatura premium e 5% sobre vendas em lojas.</p>
         </div>
         <div className="absolute -right-20 -bottom-20 opacity-20 transform rotate-12">
            <LinkIcon className="w-80 h-80" />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
            <UsersIcon className="h-8 w-8 text-blue-500 mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest"> Cliques no Link</p>
            <p className="text-3xl font-black dark:text-white">{affStats.clicks}</p>
         </div>
         <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
            <ArrowUpRightIcon className="h-8 w-8 text-green-500 mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Conversões</p>
            <p className="text-3xl font-black dark:text-white">{affStats.conversions}</p>
         </div>
         <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
            <GiftIcon className="h-8 w-8 text-brand mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ganhos Totais</p>
            <p className="text-3xl font-black text-brand">${affStats.earnings.toFixed(2)}</p>
         </div>
      </div>

      <div className="bg-white dark:bg-darkcard p-10 rounded-[3rem] border dark:border-white/10">
         <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
            <ClipboardIcon className="h-6 w-6 text-brand" />
            Seu Link de Convite
         </h3>
         <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-100 dark:bg-white/5 rounded-3xl border dark:border-white/10">
            <code className="flex-1 font-mono text-sm dark:text-gray-300 break-all p-2">{referralLink}</code>
            <button 
              onClick={copyLink}
              className={`p-4 px-8 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-brand text-white'}`}
            >
               {copied ? <><CheckIcon className="h-4 w-4" /> Copiado</> : 'Copiar Link'}
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-10 bg-brand/5 rounded-[3rem] border border-brand/20">
         <div>
            <h3 className="text-2xl font-black dark:text-white uppercase mb-4">Como funciona?</h3>
            <ul className="space-y-4">
               {[
                 { icon: UsersIcon, text: "Compartilhe seu link único com sua rede." },
                 { icon: ShoppingBagIcon, text: "Eles se cadastram e começam a usar a CyberPhone." },
                 { icon: GiftIcon, text: "Você recebe comissões vitalícias em dinheiro direto na sua conta." }
               ].map((item, i) => (
                 <li key={i} className="flex items-start gap-4">
                    <div className="p-2 bg-brand/10 rounded-xl">
                       <item.icon className="h-5 w-5 text-brand" />
                    </div>
                    <p className="text-gray-500 font-bold text-sm leading-relaxed">{item.text}</p>
                 </li>
               ))}
            </ul>
         </div>
         <div className="relative group">
            <div className="absolute inset-0 bg-brand blur-3xl opacity-10 group-hover:opacity-20 transition-all"></div>
            <img 
               src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800" 
               className="rounded-[2rem] shadow-2xl relative border border-white/10"
            />
         </div>
      </div>
    </div>
  );
};

export default AffiliatesPage;
