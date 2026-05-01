
import React, { useEffect, useState } from 'react';
import { User, EarningRecord, MonetizationStatus, MonetizationTier } from '../types';
import { monetizationService } from '../services/monetizationService';
import { findUserById, createTransaction, handleWalletTransaction } from '../services/storageService';
import TransactionHistory from './TransactionHistory';
import { useDialog } from '../services/DialogContext';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  FilmIcon, 
  ChartBarIcon, 
  CheckBadgeIcon,
  HandThumbUpIcon,
  FireIcon,
  VideoCameraIcon,
  GlobeAltIcon,
  TrophyIcon,
  ShieldExclamationIcon,
  MegaphoneIcon,
  XMarkIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  user: User;
  onBack: () => void;
}

const MonetizationDashboard: React.FC<Props> = ({ user, onBack }) => {
  const { showAlert } = useDialog();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'history' | 'eligibility'>('overview');
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [statsBreakdown, setStatsBreakdown] = useState({
    ads: 0,
    donations: 0,
    subs: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [history, elig] = await Promise.all([
        monetizationService.getEarningsHistory(user.id),
        monetizationService.checkEligibility(user)
      ]);
      setEarnings(history);
      setEligibility(elig);
      
      const breakdown = history.reduce((acc, curr) => {
        acc.ads += curr.adRevenue || 0;
        acc.donations += curr.donationsRevenue || 0;
        acc.subs += (curr.totalDaily - (curr.adRevenue || 0) - (curr.donationsRevenue || 0));
        return acc;
      }, { ads: 0, donations: 0, subs: 0 });
      setStatsBreakdown(breakdown);
      
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 50) {
      alert("O valor mínimo para saque é $50.");
      return;
    }
    if (amount > (user.balance || 0)) {
      alert("Saldo insuficiente.");
      return;
    }

    setIsProcessingWithdraw(true);
    try {
      const success = await handleWalletTransaction(user.id, amount, 'withdraw');
      
      if (success) {
        showAlert("Solicitação de saque enviada com sucesso! O valor será creditado em sua conta em até 5 dias úteis.", { type: 'success' });
        setShowWithdrawModal(false);
        setWithdrawAmount('');
      } else {
        showAlert("Erro ao processar saque. Verifique seu saldo.", { type: 'error' });
      }
    } catch (err: any) {
        showAlert(err.message || "Erro ao processar saque.", { type: 'error' });
    } finally {
      setIsProcessingWithdraw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  const isMonetized = user.monetizationStatus === 'APPROVED' || user.isMonetized;

  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.totalDaily, 0);
  const adRevenue = earnings.reduce((acc, curr) => acc + curr.adRevenue, 0);
  const donationRevenue = earnings.reduce((acc, curr) => acc + curr.donationsRevenue, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-darkcard p-6 rounded-[2rem] shadow-sm border dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-16 h-16 rounded-2xl object-cover border-2 border-brand" />
            <div className="absolute -bottom-2 -right-2 bg-brand text-white p-1 rounded-lg">
               <TrophyIcon className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black dark:text-white flex items-center gap-2">
              Centro de Criadores
              {isMonetized && <CheckBadgeIcon className="h-6 w-6 text-brand" />}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-sm font-medium">Gira seu conteúdo e ganhos.</p>
              {user.creatorStats?.strikes && user.creatorStats.strikes > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <ShieldExclamationIcon className="h-3 w-3" /> {user.creatorStats.strikes} Strikes
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Disponível</p>
             <p className="text-xl font-black text-brand">${user.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <button 
            onClick={() => setShowWithdrawModal(true)}
            disabled={!user.balance || user.balance < 50}
            className="p-3 px-6 rounded-2xl bg-brand text-white font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            Sacar
          </button>
          <button 
            onClick={onBack}
            className="p-3 px-6 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border dark:border-white/10 w-fit">
          {[
              { id: 'overview', label: 'Visão Geral' },
              { id: 'revenue', label: 'Receita' },
              { id: 'history', label: 'Transações' },
              { id: 'eligibility', label: 'Requisitos' }
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      activeTab === tab.id 
                      ? 'bg-white dark:bg-darkcard text-brand shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'history' && (
            <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm"
            >
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Histórico de Transações</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Últimos 30 dias</p>
                </div>
                <TransactionHistory userId={user.id} limitCount={30} />
            </motion.div>
        )}

        {activeTab === 'overview' && !isMonetized && (
           <motion.div
             key="not-monetized"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
           >
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-6">
                 <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-xl border dark:border-white/10">
                   <h2 className="text-xl font-black mb-6 dark:text-white">Caminho para a Monetização</h2>
                   
                   <div className="space-y-8">
                     {/* Followers */}
                     <div className="space-y-3">
                       <div className="flex justify-between items-end">
                         <div className="flex items-center gap-3">
                           <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-500">
                             <UserGroupIcon className="h-6 w-6" />
                           </div>
                           <div>
                             <p className="font-black dark:text-white">Inscritos / Seguidores</p>
                             <p className="text-xs text-gray-500">{eligibility.goals.currentFollowers} de {eligibility.goals.followersGoal} necessários</p>
                           </div>
                         </div>
                         <span className="text-lg font-black text-brand">{Math.min(100, Math.round((eligibility.goals.currentFollowers / eligibility.goals.followersGoal) * 100))}%</span>
                       </div>
                       <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${Math.min(100, (eligibility.goals.currentFollowers / eligibility.goals.followersGoal) * 100)}%` }}
                           className="h-full bg-blue-500"
                         />
                       </div>
                     </div>

                     {/* Watch Hours */}
                     <div className="space-y-3">
                       <div className="flex justify-between items-end">
                         <div className="flex items-center gap-3">
                           <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-2xl text-purple-500">
                             <FilmIcon className="h-6 w-6" />
                           </div>
                           <div>
                             <p className="font-black dark:text-white">Horas de Visualização Públicas</p>
                             <p className="text-xs text-gray-500">{Math.round(eligibility.goals.currentWatchHours)} de {eligibility.goals.watchHoursGoal} necessárias</p>
                           </div>
                         </div>
                         <span className="text-lg font-black text-brand">{Math.min(100, Math.round((eligibility.goals.currentWatchHours / eligibility.goals.watchHoursGoal) * 100))}%</span>
                       </div>
                       <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${Math.min(100, (eligibility.goals.currentWatchHours / eligibility.goals.watchHoursGoal) * 100)}%` }}
                           className="h-full bg-purple-500"
                         />
                       </div>
                     </div>

                     {/* Shorts Views */}
                     <div className="space-y-3">
                       <div className="flex justify-between items-end">
                         <div className="flex items-center gap-3">
                           <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-2xl text-orange-500">
                             <FireIcon className="h-6 w-6" />
                           </div>
                           <div>
                             <p className="font-black dark:text-white">Visualizações de Reels</p>
                             <p className="text-xs text-gray-500">{eligibility.goals.currentShortsViews} de {eligibility.goals.shortsViewsGoal} necessárias</p>
                           </div>
                         </div>
                         <span className="text-lg font-black text-brand">{Math.min(100, Math.round((eligibility.goals.currentShortsViews / eligibility.goals.shortsViewsGoal) * 100))}%</span>
                       </div>
                       <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${Math.min(100, (eligibility.goals.currentShortsViews / eligibility.goals.shortsViewsGoal) * 100)}%` }}
                           className="h-full bg-orange-500"
                         />
                       </div>
                     </div>
                   </div>

                   {!eligibility.eligible ? (
                     <div className="mt-12 p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-dashed border-gray-200 dark:border-white/10">
                       <p className="text-sm font-bold text-gray-500 text-center uppercase tracking-widest mb-4">Requisitos Pendentes</p>
                       <ul className="space-y-3">
                         {eligibility.reason.map((r: string, i: number) => (
                           <li key={i} className="flex items-center gap-3 text-sm font-medium dark:text-gray-300">
                             <div className="h-2 w-2 rounded-full bg-gray-400" />
                             {r}
                           </li>
                         ))}
                       </ul>
                     </div>
                   ) : (
                     <button className="mt-12 w-full p-5 bg-brand text-white font-black rounded-[2rem] shadow-xl shadow-brand/30 hover:scale-[1.02] transition-transform">
                       Inscrever-se Agora
                     </button>
                   )}
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="bg-gradient-to-br from-brand to-brand/70 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-brand/20">
                   <TrophyIcon className="h-12 w-12 mb-6" />
                   <h3 className="text-xl font-black mb-2">Vantagens de se tornar um Criador</h3>
                   <ul className="space-y-4 text-white/80 font-medium">
                     <li className="flex items-center gap-3">
                       <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</div>
                       Ganhe com anúncios em vídeos
                     </li>
                     <li className="flex items-center gap-3">
                       <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</div>
                       Receba Super Chats e Presentes
                     </li>
                     <li className="flex items-center gap-3">
                       <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</div>
                       Crie clubes de membros pagos
                     </li>
                     <li className="flex items-center gap-3">
                       <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</div>
                       Acesso ao Brand Connect
                     </li>
                   </ul>
                 </div>
               </div>
             </div>
           </motion.div>
        )}

        {activeTab === 'overview' && isMonetized && (
            <motion.div
                key="monetized-overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-white dark:bg-darkcard p-6 rounded-[2rem] border dark:border-white/10 shadow-sm col-span-1 md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo Financeiro</p>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase">Disponível</p>
                                <p className="text-3xl font-black text-green-600">${user.balance?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase">Total Ganhos</p>
                                <p className="text-3xl font-black dark:text-white">${user.totalEarnings?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                        {user.pendingBalance && user.pendingBalance > 0 && (
                            <div className="mt-4 pt-4 border-t dark:border-white/5 flex items-center justify-between">
                                <p className="text-[10px] font-black text-orange-500 uppercase flex items-center gap-2">
                                    <BanknotesIcon className="h-4 w-4" /> Em Custódia (Pendente)
                                </p>
                                <p className="text-lg font-black text-orange-500">${user.pendingBalance.toFixed(2)}</p>
                            </div>
                        )}
                    </div>
                    {[
                    { label: 'Video Ads', value: `$${adRevenue.toFixed(2)}`, icon: GlobeAltIcon, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'Super Chats', value: `$${donationRevenue.toFixed(2)}`, icon: HandThumbUpIcon, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                    { label: 'Visualizações', value: earnings.reduce((acc, curr) => acc + curr.viewsCount, 0).toLocaleString(), icon: ChartBarIcon, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                    ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-darkcard p-6 rounded-[2rem] border dark:border-white/10 shadow-sm">
                        <div className={`${stat.bg} ${stat.color} h-12 w-12 rounded-2xl flex items-center justify-center mb-4`}>
                        <stat.icon className="h-6 w-6" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-black dark:text-white mt-1">{stat.value}</p>
                    </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Desempenho Diário</h3>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase">Faturamento</button>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={earnings}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--brand-color)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--brand-color)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" strokeOpacity={0.1} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', fontWeight: 'bold', background: '#fff' }}
                                        itemStyle={{ color: 'var(--brand-color)' }}
                                    />
                                    <Area type="monotone" dataKey="totalDaily" name="Ganhos" stroke="var(--brand-color)" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stats Breakdown */}
                    <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Fontes de Receita</h3>
                        <div className="space-y-6">
                            {[
                            { label: 'Video Ads', amount: adRevenue, percent: (adRevenue / (totalEarnings || 1)) * 100, color: 'bg-blue-500' },
                            { label: 'Super Chat', amount: donationRevenue, percent: (donationRevenue / (totalEarnings || 1)) * 100, color: 'bg-orange-500' },
                            { label: 'Outros', amount: totalEarnings - adRevenue - donationRevenue, percent: ((totalEarnings - adRevenue - donationRevenue) / (totalEarnings || 1)) * 100, color: 'bg-purple-500' },
                            ].map((source, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                <span className="font-bold dark:text-white">{source.label}</span>
                                <span className="font-black text-brand">${source.amount.toFixed(2)}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(2, source.percent)}%` }}
                                    className={`h-full ${source.color}`}
                                />
                                </div>
                            </div>
                            ))}
                        </div>

                        <div className="mt-12 p-8 bg-brand rounded-[2rem] text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center mb-2">Próximo Ciclo</p>
                            <p className="text-3xl font-black text-center tracking-tighter">15 MAIO</p>
                            <div className="mt-4 pt-4 border-t border-white/20">
                                <p className="text-[8px] font-bold opacity-60 text-center uppercase">Retenção de Segurança CyBer ativa</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
           <div className="bg-white dark:bg-[#12141c] w-full max-w-sm rounded-[3rem] p-10 relative border border-white/5 shadow-2xl">
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white"
              >
                 <XMarkIcon className="h-6 w-6" />
              </button>

              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BanknotesIcon className="h-8 w-8 text-brand" />
                 </div>
                 <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Solicitar Saque</h3>
                 <p className="text-sm text-gray-500 font-bold mt-2">Mínimo: $50.00</p>
              </div>

              <div className="space-y-4 mb-8">
                 <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Valor do Saque</p>
                    <div className="flex items-center gap-2">
                       <span className="text-2xl font-black text-brand">$</span>
                       <input 
                         type="number" 
                         value={withdrawAmount}
                         onChange={(e) => setWithdrawAmount(e.target.value)}
                         placeholder="0.00"
                         className="bg-transparent text-2xl font-black dark:text-white outline-none w-full"
                         autoFocus
                       />
                    </div>
                 </div>
                 <div className="flex justify-between items-center px-4">
                    <p className="text-xs font-bold text-gray-500">Saldo disponível:</p>
                    <p className="text-sm font-black dark:text-white">${user.balance?.toFixed(2) || '0.00'}</p>
                 </div>
              </div>

              <button 
                onClick={handleWithdraw}
                disabled={isProcessingWithdraw || !withdrawAmount || parseFloat(withdrawAmount) < 50 || parseFloat(withdrawAmount) > (user.balance || 0)}
                className="w-full bg-brand text-white py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 disabled:grayscale"
              >
                {isProcessingWithdraw ? 'Processando...' : 'Confirmar Saque'}
              </button>
              
              <p className="text-[10px] text-gray-500 font-bold text-center mt-6 px-4">O valor será transferido para sua conta CyberPay em até 5 dias úteis.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default MonetizationDashboard;
