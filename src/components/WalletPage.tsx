
import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { 
  WalletIcon, 
  ArrowPathIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  PlusIcon,
  ShoppingBagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { motion } from 'motion/react';

interface WalletPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => Promise<void>;
  onOpenAction: (mode: 'deposit' | 'withdraw') => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ currentUser, onNavigate, refreshUser, onOpenAction }) => {
  const [exchangeRate] = useState(930);
  const [activeCurrency, setActiveCurrency] = useState<'KZ' | 'USDT'>('KZ');
  const [showChart, setShowChart] = useState(true);
  
  // Simulated Chart Data
  const chartPoints = [30, 45, 35, 55, 48, 65, 58, 80, 72, 90, 85, 95];

  // Mock transaction history
  const transactions = [
    { id: 1, type: 'receive', amount: 50.00, currency: 'USDT', from: 'Venda: iPhone 15 Pro', date: 'Hoje, 14:20', status: 'concluído', icon: ShoppingBagIcon },
    { id: 2, type: 'send', amount: 15.00, currency: 'USDT', to: 'Assinatura Premium', date: 'Ontem', status: 'concluído', icon: SparklesIcon },
    { id: 3, type: 'receive', amount: 125000, currency: 'KZ', from: 'Depósito Unitel Money', date: '15 Mai', status: 'concluído', icon: BanknotesIcon },
    { id: 4, type: 'receive', amount: 35.50, currency: 'USDT', from: 'Royalties de Vídeo', date: '12 Mai', status: 'concluído', icon: ArrowDownCircleIcon },
  ];

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-8 bg-[#fdfdfd] dark:bg-[#08090d] animate-fade-in font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Superior Header */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 w-fit">
                 <WalletIcon className="h-4 w-4 text-blue-600" />
                 <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Digital Asset Management</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-gray-950 dark:text-white uppercase tracking-tighter leading-[0.9]">
                Sua Liberdade <br /><span className="text-blue-600 italic">Financeira</span>.
              </h2>
           </div>
           
           <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-3xl border border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setActiveCurrency('KZ')}
                className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCurrency === 'KZ' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xl' : 'text-gray-500'}`}
              >
                AOA / Kwanza
              </button>
              <button 
                onClick={() => setActiveCurrency('USDT')}
                className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCurrency === 'USDT' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xl' : 'text-gray-500'}`}
              >
                USDT / Crypto
              </button>
           </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Balances Column */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Massive Balance Card */}
              <div className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[4rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                 <div className="relative bg-white dark:bg-[#12141c] p-10 md:p-16 rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.07] rotate-12">
                       <BanknotesIcon className="h-64 w-64 text-blue-600" />
                    </div>

                    <div className="relative z-10 space-y-12">
                       <div className="flex justify-between items-start">
                          <div className="space-y-1">
                             <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Patrimônio Líquido Estimado</p>
                             <div className="flex items-baseline gap-3">
                                <span className="text-6xl md:text-8xl font-black text-gray-950 dark:text-white tracking-tighter">
                                   {activeCurrency === 'KZ' ? (
                                      ((currentUser.balance || 0) * exchangeRate).toLocaleString('pt-BR')
                                   ) : (
                                      (currentUser.balance || 0).toFixed(2)
                                   )}
                                </span>
                                <span className="text-2xl md:text-4xl font-bold text-blue-600 italic">{activeCurrency}</span>
                             </div>
                             <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                                <ArrowDownCircleIcon className="h-4 w-4 text-emerald-500" /> +12.4% em relação ao mês passado
                             </p>
                          </div>
                       </div>

                       {/* Mini Chart Decoration */}
                       <div className="flex items-end gap-1.5 h-24 pt-4">
                          {chartPoints.map((p, i) => (
                             <motion.div 
                               key={i}
                               initial={{ height: 0 }}
                               animate={{ height: `${p}%` }}
                               transition={{ delay: i * 0.05, duration: 1 }}
                               className={`flex-1 rounded-full ${i === chartPoints.length - 1 ? 'bg-blue-600 shadow-lg shadow-blue-600/40' : 'bg-gray-200 dark:bg-white/10'}`}
                             />
                          ))}
                       </div>

                       <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 dark:border-white/5 pt-10">
                          <button onClick={() => onOpenAction('deposit')} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                             <PlusIcon className="h-5 w-5 stroke-[3]" /> Adicionar Fundos
                          </button>
                          <button onClick={() => onOpenAction('withdraw')} className="flex-1 py-5 bg-gray-950 dark:bg-white text-white dark:text-gray-950 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                             <ArrowUpCircleIcon className="h-5 w-5" /> Retirar Capital
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Transactions List */}
              <div className="bg-white dark:bg-[#12141c] rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-xl overflow-hidden p-8 md:p-12">
                 <div className="flex items-center justify-between mb-10 px-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                       <ClockIcon className="h-5 w-5 text-blue-600" /> Fluxo de Atividades
                    </h3>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-full">Ver Relatório Completo</button>
                 </div>

                 <div className="space-y-2">
                    {transactions.map((tx, i) => (
                       <div key={tx.id} className="group p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-[2.5rem] transition-all">
                          <div className="flex items-center gap-6">
                             <div className={`p-4 rounded-2xl shadow-sm ${tx.type === 'receive' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'}`}>
                                {tx.icon ? <tx.icon className="h-6 w-6" /> : <ArrowDownCircleIcon className="h-6 w-6" />}
                             </div>
                             <div>
                                <h4 className="font-black dark:text-white uppercase text-sm tracking-tight group-hover:text-blue-600 transition-colors">{tx.from || tx.to}</h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tx.date}</p>
                                   <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{tx.status}</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={`font-black text-lg ${tx.type === 'receive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === 'receive' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
                             </p>
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-60">ID #TX-{Math.floor(Math.random()*90000 + 10000)}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Sidebar Info */}
           <div className="space-y-8">
              
              {/* Network Status */}
              <div className="bg-gray-950 p-10 rounded-[3rem] text-white space-y-8 relative overflow-hidden shadow-2xl">
                 <div className="absolute -right-8 -bottom-8 opacity-10">
                    <CurrencyDollarIcon className="h-48 w-48 text-purple-500" />
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                       <ShieldCheckIcon className="h-6 w-6 text-purple-400" />
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Redes Certificadas</h3>
                    </div>
                    <div className="space-y-4">
                       {[
                         { name: 'TRON / USDT (TRC-20)', status: 'Ativo', color: 'bg-emerald-500' },
                         { name: 'BNB Smart Chain', status: 'Ativo', color: 'bg-emerald-500' },
                         { name: 'Angola Unitel Money', status: 'Ativo', color: 'bg-emerald-500' },
                         { name: 'Pagamento via Multicaixa', status: 'Manutenção', color: 'bg-amber-500' }
                       ].map((n, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                            <span className="text-[11px] font-bold text-gray-300">{n.name}</span>
                            <div className="flex items-center gap-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${n.color}`} />
                               <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{n.status}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Security Banner */}
              <div className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-600/20">
                 <div className="p-4 bg-white/20 rounded-2xl w-fit mb-6">
                    <ShieldCheckIcon className="h-8 w-8" />
                 </div>
                 <h4 className="text-xl font-black uppercase tracking-tighter mb-2 italic">Cofre de Segurança</h4>
                 <p className="text-xs font-medium text-blue-100 leading-relaxed opacity-90 mb-8">
                    Seus ativos estão protegidos por inteligência artificial e protocolos bancários internacionais.
                 </p>
                 <button onClick={() => onNavigate('support')} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Reportar Incidente</button>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default WalletPage;
