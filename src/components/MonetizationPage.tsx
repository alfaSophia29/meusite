import React, { useState } from 'react';
import { User, UserType } from '../types';
import { 
  DollarSign, 
  Award, 
  TrendingUp, 
  Clock, 
  Play, 
  Users, 
  Check, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  Wallet, 
  ExternalLink, 
  FileText, 
  HelpCircle,
  Video,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateUserData } from '../services/storageService';

interface MonetizationPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => Promise<void>;
}

type ActiveTab = 'earn' | 'goals' | 'process' | 'safety';

export const MonetizationPage: React.FC<MonetizationPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('earn');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsAcceptedCheckbox, setTermsAcceptedCheckbox] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Initialize/fallback for monetization goals
  const goals = currentUser.monetizationGoals || {
    followersGoal: 1000,
    watchHoursGoal: 4000,
    shortsViewsGoal: 10000000,
    currentFollowers: currentUser.followers?.length || 0,
    currentWatchHours: 0,
    currentShortsViews: 0,
    termsAccepted: false,
    verificationStep: currentUser.idVerificationStatus === 'APPROVED'
  };

  const followersCount = currentUser.followers?.length || 0;
  const isMonetized = currentUser.isMonetized || currentUser.userType === 'CREATOR' || currentUser.monetizationStatus === 'APPROVED';
  const isProfessional = currentUser.userType === 'CREATOR' || currentUser.isAdmin;

  // Calculate percentages
  const followersPercentage = Math.min(100, (followersCount / goals.followersGoal) * 100);
  const watchHoursPercentage = Math.min(100, ((goals.currentWatchHours || 0) / goals.watchHoursGoal) * 100);
  const shortsViewsPercentage = Math.min(100, ((goals.currentShortsViews || 0) / goals.shortsViewsGoal) * 100);

  // Meets criteria checks
  const meetsFollowers = followersCount >= goals.followersGoal;
  const meetsWatchHours = (goals.currentWatchHours || 0) >= goals.watchHoursGoal;
  const meetsShortsViews = (goals.currentShortsViews || 0) >= goals.shortsViewsGoal;
  const hasVideoVolume = true; // Simulating channel history active
  const identityVerified = currentUser.idVerificationStatus === 'APPROVED';
  
  // FacePhone Rule: Meet followers AND either Watch hours OR Reels views
  const meetsThresholds = meetsFollowers && (meetsWatchHours || meetsShortsViews);
  const canApply = meetsThresholds && identityVerified && goals.termsAccepted && currentUser.monetizationStatus !== 'PENDING' && !isMonetized;

  const handleAcceptTerms = async () => {
    if (!termsAcceptedCheckbox) return;
    try {
      const updatedGoals = {
        ...goals,
        currentFollowers: followersCount,
        termsAccepted: true
      };
      await updateUserData(currentUser.id, { 
        monetizationGoals: updatedGoals 
      });
      await refreshUser();
      setIsTermsModalOpen(false);
      showToast("Termos do Programa de Parcerias aceitos com sucesso!");
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar aceitação de termos.");
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleApplyForMonetization = async () => {
    setIsSubmittingReview(true);
    try {
      await updateUserData(currentUser.id, {
        monetizationStatus: 'PENDING'
      });
      await refreshUser();
      showToast("Candidatura enviada para a banca oficial do FacePhone!");
    } catch (e) {
      console.error(e);
      showToast("Falha ao processar candidatura.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const waysToEarn = [
    {
      title: "Anúncios da Página de Exibição",
      desc: "Gere receita com anúncios e visualizações premium do FacePhone nas publicações de longa duração.",
      status: isMonetized ? "Ativo" : "Disponível na monetização",
      details: "Os anúncios de vídeo e display são veiculados antes, durante ou depois dos seus uploads em formato largo.",
      color: "bg-red-500",
      icon: Play
    },
    {
      title: "Anúncios do Feed de Reels",
      desc: "Ganhe com a divisão de publicidade em loop intercalada entre os vídeos dinâmicos do seu Reels.",
      status: isMonetized ? "Ativo" : "Disponível na monetização",
      details: "Os anúncios de transição de Reels compartilham receita proporcional às visualizações que seu perfil gera.",
      color: "bg-amber-500",
      icon: Video
    },
    {
      title: "Clubes de Canais (Membros)",
      desc: "Crie níveis extras pagos mensalmente onde seus maiores fãs ganham selos e chats exclusivos.",
      status: "Desbloqueia no Nível 2",
      details: "Fidelize sua audiência cobrando valores em Kwanzas ou USDT por conteúdo de bastidores.",
      color: "bg-emerald-500",
      icon: Users
    },
    {
      title: "Super Chats e Supers",
      desc: "Fãs apoiam diretamente sua conta com pagamentos avulsos de destaque nas lives ou posts.",
      status: "Desbloqueia no Nível 2",
      details: "Mensagens compradas que ficam fixadas no topo do chat de transmissões ou destaque nos comentários.",
      color: "bg-blue-500",
      icon: HeartIcon
    },
    {
      title: "Shopping do Criador",
      desc: "Vincule produtos físicos ou infoprodutos da sua loja FacePhone diretamente nas mídias.",
      status: isMonetized ? "Configurar" : "Disponível em breve",
      details: "Integração instantânea para o público comprar as peças que você usa nos posts com um clique.",
      color: "bg-fuchsia-500",
      icon: Wallet
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-8 bg-gray-50 dark:bg-[#07090e] dark:text-gray-100 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Banner Toast Notification */}
        <AnimatePresence>
          {successToast && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-black uppercase tracking-wider"
            >
              <Check className="h-5 w-5 bg-white/20 p-1 rounded-full text-white" />
              <span>{successToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100 dark:border-white/5 pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-red-600/10 text-red-600 border border-red-600/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3 w-3" /> FacePhone Partner Program (YPP)
              </span>
              {isMonetized && (
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Check className="h-3 w-3" /> Parceiro Ativo
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-950 dark:text-white uppercase tracking-tighter leading-none">
              Estúdio de <span className="text-red-600">Monetização</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
              Descubra o ecossistema completo de criadores. Regras transparentes, acompanhamento de metas em tempo real e procedimentos oficiais para capacitar a sua comunidade no FacePhone Partner Program.
            </p>
          </div>

          {!isMonetized && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Estado Atual de Parceiro</h4>
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {currentUser.monetizationStatus === 'PENDING' ? (
                    <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">Em Análise pelo Comitê</span>
                  ) : currentUser.monetizationStatus === 'REJECTED' ? (
                    <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">Rejeitado</span>
                  ) : (
                    <span className="text-gray-500 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-md">Não Qualificado</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>



        {/* Tab Controls */}
        <div className="flex border-b border-gray-200 dark:border-white/5 scrollbar-hide overflow-x-auto gap-2">
          {[
            { id: 'earn', label: 'Benefícios & Ganhos', icon: DollarSign },
            { id: 'goals', label: 'Critérios de Parceria', icon: TrendingUp },
            { id: 'process', label: 'Etapas de Inscrição', icon: FileText },
            { id: 'safety', label: 'Políticas & Segurança', icon: ShieldCheck }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-6 py-4.5 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all relative shrink-0 ${
                activeTab === tab.id 
                  ? 'border-red-600 text-red-600 dark:text-red-500 bg-red-500/[0.02]' 
                  : 'border-transparent text-gray-500 hover:text-gray-950 dark:hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'process' && canApply && (
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping absolute top-3.5 right-3" />
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        <div className="mt-6">
          
          {/* TAB 1: HOW TO EARN / BENEFITS */}
          {activeTab === 'earn' && (
            <div className="space-y-12">
              
              {/* Creator dashboard widget if already monetized */}
              {isMonetized && (
                <div className="p-8 sm:p-12 rounded-[3rem] bg-gradient-to-br from-red-600 to-rose-700 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-100 bg-white/10 px-3.5 py-1 rounded-full border border-white/10 inline-block">Membro Ativo Certificado</span>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">Você é Parceiro FacePhone!</h2>
                        <p className="text-xs text-red-100 max-w-lg font-medium">Parabéns! Sua conta monetizada está gerando lucros através do FacePhone Ads e publicidade nativa do ecossistema.</p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => onNavigate('wallet')} 
                          className="bg-white text-red-600 hover:bg-zinc-50 active:scale-95 transition-all px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg"
                        >
                          <Wallet className="h-4 w-4" /> Sacar Fundos
                        </button>
                        <button 
                          onClick={() => onNavigate('feed')} 
                          className="bg-red-800 text-white hover:bg-red-900 active:scale-95 transition-all px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                        >
                          Mais Conteúdos
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/10">
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-200 block">Saldo Monetizado</span>
                        <p className="text-2xl font-black tracking-tight">${(currentUser.balance || 0).toFixed(2)} USDT</p>
                        <span className="text-[10px] font-bold text-red-100 block">~ {((currentUser.balance || 0) * 828).toLocaleString(undefined, { maximumFractionDigits: 0 })} Kwanza</span>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-200 block">Exibições Mensais</span>
                        <p className="text-2xl font-black tracking-tight">412.5k</p>
                        <span className="text-[10px] font-bold text-emerald-300 block flex items-center gap-1 font-mono">
                          ▲ +14% vs. mês anterior
                        </span>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-200 block">Horas de Visualização</span>
                        <p className="text-2xl font-black tracking-tight">18,400h</p>
                        <span className="text-[10px] font-bold text-red-100 block">Retenção de 4:12m média</span>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-200 block">RPM Estimado</span>
                        <p className="text-2xl font-black tracking-tight">$0.32 USDT</p>
                        <span className="text-[10px] font-bold text-red-100 block">Receita a cada mil exibições</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ways to earn grid */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Maneiras de gerar receita</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Sendo um parceiro oficial você desbloqueia múltiplos fluxos financeiros baseados em engajamento.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {waysToEarn.map((item, i) => (
                    <div 
                      key={i} 
                      className="bg-white dark:bg-zinc-950 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between gap-6"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className={`p-3.5 rounded-2xl ${item.color} text-white`}>
                            <item.icon className="h-6 w-6" />
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            isMonetized ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-white/5 text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-base font-black text-gray-950 dark:text-white uppercase tracking-tight">{item.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-white/5 text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic flex items-start gap-1">
                        <Info className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                        <span>{item.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ELIGIBILITY GOALS */}
          {activeTab === 'goals' && (
            <div className="space-y-8">
              
              <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-8 shadow-xl">
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-950 dark:text-white">Requisitos de Qualidade para Parceiros</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                    Acompanhe seu desempenho ao vivo. Quando atingir as metas do programa, o formulário de candidatura é disponibilizado instantaneamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Goal #1: Followers */}
                  <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 flex flex-col justify-between gap-6 relative overflow-hidden group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-600/10 text-red-600 rounded-xl">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-gray-950 dark:text-white">Inscritos / Seguidores</h4>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Metas da comunidade angolana</p>
                        </div>
                      </div>

                      <div className="pt-4 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-black text-gray-900 dark:text-white">{followersCount.toLocaleString()}</p>
                          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium">seguidores ativos na conta</p>
                        </div>
                        <p className="text-xs font-black text-zinc-400">Meta: {goals.followersGoal.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/5 overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: `${followersPercentage}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-red-600 dark:text-red-500 font-mono">{followersPercentage.toFixed(0)}% Concluído</span>
                        {meetsFollowers ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black flex items-center gap-1 uppercase tracking-wider text-[8px] border border-emerald-500/10">✓ Meta Atingida</span>
                        ) : (
                          <span className="text-zinc-400 font-medium">Aguardando</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goal #2: Watch Hours */}
                  <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 flex flex-col justify-between gap-6 relative overflow-hidden group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-600/10 text-red-600 rounded-xl">
                          <Clock className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-gray-950 dark:text-white">Horas Exibição Públicas</h4>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Últimos 12 meses acumulados</p>
                        </div>
                      </div>

                      <div className="pt-4 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-black text-gray-900 dark:text-white">{(goals.currentWatchHours || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} h</p>
                          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium">horas oficiais registradas de plays</p>
                        </div>
                        <p className="text-xs font-black text-zinc-400">Meta: {goals.watchHoursGoal.toLocaleString()}h</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/5 overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: `${watchHoursPercentage}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-red-600 dark:text-red-500 font-mono">{watchHoursPercentage.toFixed(0)}% Concluído</span>
                        {meetsWatchHours ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black flex items-center gap-1 uppercase tracking-wider text-[8px] border border-emerald-500/10">✓ Meta Atingida</span>
                        ) : (
                          <span className="text-zinc-400 font-medium">Faltam {(goals.watchHoursGoal - (goals.currentWatchHours || 0)).toFixed(0)} horas</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goal #3: Shorts Views */}
                  <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 flex flex-col justify-between gap-6 relative overflow-hidden group md:col-span-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-600/10 text-red-600 rounded-xl">
                          <Play className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-gray-950 dark:text-white">Ou Visualizações de Reels/Shorts</h4>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Visualizações públicas nos últimos 90 dias</p>
                        </div>
                      </div>

                      <div className="pt-4 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-black text-gray-900 dark:text-white">{(goals.currentShortsViews || 0).toLocaleString()}</p>
                          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium">visualizações rápidas de Reels computadas</p>
                        </div>
                        <p className="text-xs font-black text-zinc-400 font-mono">Meta: {goals.shortsViewsGoal.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/5 overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: `${shortsViewsPercentage}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-red-600 dark:text-red-500 font-mono">{shortsViewsPercentage.toFixed(2)}% Concluído</span>
                        {meetsShortsViews ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black flex items-center gap-1 uppercase tracking-wider text-[8px] border border-emerald-500/10">✓ Meta Atingida</span>
                        ) : (
                          <span className="text-zinc-400 font-medium">Aguardando views de alta retenção</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-4 text-xs font-medium dark:text-zinc-300 leading-relaxed max-w-3xl">
                  <Info className="h-5 w-5 text-red-600 shrink-0" />
                  <p>
                    <strong className="text-gray-950 dark:text-white uppercase tracking-wider text-[10px] block mb-1">Regra Oficial de Qualificação</strong>
                    Para ser aprovado no programa de parceiros FacePhone, o criador precisa acumular <span className="font-bold">1.000 seguidores</span> oficiais, e adicionalmente optar entre alcançar <span className="font-bold">4.000 horas de exibição em vídeos públicos</span> ou <span className="font-bold">10 milhões de visualizações de Reels</span> em conformidade com as nossas diretrizes de originalidade.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SIGN UP STEPS RULES / PROCEDURES */}
          {activeTab === 'process' && (
            <div className="space-y-8">
              
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Processo de Inscrição Oficial</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Complete as seguintes etapas obrigatórias na ordem especificada para obter a liquidez de parceiro nas suas moedas cadastradas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Step 1 */}
                <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-6.5 flex flex-col justify-between min-h-[320px] shadow-lg relative overflow-hidden group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-600/10 px-2.5 py-1 rounded-lg">Passo 01</span>
                      <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-white/5 h-6 w-6 rounded-full flex items-center justify-center font-mono">01</span>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Contrato YPP</h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">
                        Leia e assine formalmente o acordo oficial de repasse de 55% de receitas publicitárias e conformidade do criador.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 dark:border-white/5">
                    {goals.termsAccepted ? (
                      <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest bg-emerald-500/10 p-3 rounded-xl justify-center">
                        <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" /> Termos Aceitos
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsTermsModalOpen(true)}
                        className="w-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px]"
                      >
                        Iniciar Leitura
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-6.5 flex flex-col justify-between min-h-[320px] shadow-lg relative overflow-hidden group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                        identityVerified ? 'text-emerald-600 bg-emerald-600/10' : 'text-red-600 bg-red-600/10'
                      }`}>
                        FacePhone ID
                      </span>
                      <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-white/5 h-6 w-6 rounded-full flex items-center justify-center font-mono">02</span>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Verificar Identidade</h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed font-semibold">
                        Aprovação cadastral (Documento de Identidade, Passaporte e Selfie) contra fraudes e cumprimento de diretrizes do comitê.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 dark:border-white/5">
                    {identityVerified ? (
                      <div className="flex flex-col gap-1 text-center bg-emerald-500/10 text-emerald-500 p-3 rounded-xl">
                        <span className="font-mono text-[9px] uppercase tracking-wider font-black flex items-center justify-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Documentação OK
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600 font-mono">ID VERIFICADO</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[9px] uppercase tracking-widest font-black text-center text-red-500 border border-red-500/10 bg-red-500/5 py-1.5 rounded-lg">
                          {currentUser.idVerificationStatus === 'PENDING' ? "ID EM ANÁLISE" : "REQUER VERIFICAÇÃO"}
                        </div>
                        <button 
                          onClick={() => onNavigate('settings')}
                          className="w-full bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-900 text-white active:scale-95 transition-all py-3 rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                          Ir para Validação
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-6.5 flex flex-col justify-between min-h-[320px] shadow-lg relative overflow-hidden group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-600/10 px-2.5 py-1 rounded-lg">Payout</span>
                      <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-white/5 h-6 w-6 rounded-full flex items-center justify-center font-mono">03</span>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Vincular Wallet</h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">
                        Conexão do seu ID de carteira digital FacePhone Pay para automação mensal e depósitos de lucros em Kwanzas ou USDT.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 dark:border-white/5 font-semibold">
                    <div className="flex flex-col gap-1 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 p-3 rounded-xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-1">
                        <Check className="h-3 w-3" /> Vinculado Ativo
                      </p>
                      <p className="text-[9px] font-mono text-zinc-500 break-all">AO-{currentUser.id.substring(0, 12).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-6.5 flex flex-col justify-between min-h-[320px] shadow-lg relative overflow-hidden group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-600/10 px-2.5 py-1 rounded-lg">Auditoria</span>
                      <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-white/5 h-6 w-6 rounded-full flex items-center justify-center font-mono">04</span>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Banca Avaliadora</h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">
                        Submissão para auditoria visual manual pela comissão técnica para julgar e certificar o canal.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 dark:border-white/5">
                    {isMonetized ? (
                      <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest bg-emerald-500/10 p-3 rounded-xl justify-center">
                        <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" /> Aprovado Oficial
                      </div>
                    ) : currentUser.monetizationStatus === 'PENDING' ? (
                      <div className="bg-amber-500/10 text-amber-500 font-black uppercase text-[9px] py-3.5 px-1 rounded-xl text-center tracking-widest border border-amber-500/20 font-bold">
                        Banca Avaliando...
                      </div>
                    ) : (
                      <button 
                        disabled={!canApply}
                        onClick={handleApplyForMonetization}
                        className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                          canApply 
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl hover:-translate-y-0.5 active:scale-95' 
                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isSubmittingReview ? "Enviando..." : "Candidatar Canal"}
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Apply guide constraints */}
              {!isMonetized && currentUser.monetizationStatus !== 'PENDING' && (
                <div className="p-6 rounded-[2rem] bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-4xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Verificação de Viabilidade para Solicitação</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        {goals.termsAccepted ? (
                          <span className="text-emerald-500">✓ Passo 1 Feito</span>
                        ) : (
                          <span className="text-red-500">✗ Aceitar Termos</span>
                        )}
                      </span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20" />
                      <span className="flex items-center gap-1.5">
                        {isProfessional ? (
                          <span className="text-emerald-500">✓ Passo 2 Feito</span>
                        ) : (
                          <span className="text-emerald-500">✓ Passo 2 Pronto (Wallet)</span>
                        )}
                      </span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20" />
                      <span className="flex items-center gap-1.5">
                        {meetsThresholds ? (
                          <span className="text-emerald-500">✓ Metas de Engajamento Batidas</span>
                        ) : (
                          <span className="text-red-500">✗ Falta atingir metas</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={!canApply}
                    onClick={handleApplyForMonetization}
                    className={`px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      canApply 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl hover:scale-105 active:scale-95' 
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    Candidatar-se Agora
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SAFETY POLICIES */}
          {activeTab === 'safety' && (
            <div className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-8 space-y-6 shadow-md">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-emerald-600" />
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Estado de Integridade da Conta</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Diretrizes da comunidade do FacePhone</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Avisos Ativos</span>
                        <p className="text-xs font-black text-emerald-600">0 Strikes de Conduta</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Excelente</span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                      Contas qualificadas que possuem strikes ou violações severas das diretrizes sobre discurso de ódio, fraudes de pirâmides ou imitações de marca podem ser automaticamente suspensas de receber dividendos publicitários.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-8 space-y-6 shadow-md">
                  <div className="flex items-center gap-3">
                    <Lock className="h-8 w-8 text-red-500" />
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Segurança Avançada de Contas</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Acesso seguro e compliance BI/NIF</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                      identityVerified 
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600' 
                        : 'bg-red-500/5 border-red-500/10 text-red-600'
                    }`}>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest">Verificação de Identidade</span>
                        <p className="text-xs font-black">
                          {identityVerified ? "✓ Documento Aprovado" : "✗ Identidade não verificada"}
                        </p>
                      </div>
                      {!identityVerified && (
                        <button 
                          onClick={() => onNavigate('settings')} 
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                          Verify ID
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                      O FacePhone exige a comprovação cadastral do comitê (BI ou passaporte residencial) para fins tributários e prevenção de evasão cambial em transações da Web3.
                    </p>
                  </div>
                </div>

              </div>

              {/* Policy agreement box */}
              <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-6 shadow-md">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 dark:text-white">Diretrizes de Conteúdo Adequado para Publicidade</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-4xl">
                  Ao solicitar a monetização no FacePhone Pay, o criador aceita que todos os seus vídeos, reels e livestreams passem por uma análise de adequação automática por IA. Conteúdos contendo spam de links afiliados sem sinalização, pirataria intelectual, clickbait de pânico financeiro ou materiais ofensivos terão a monetização bloqueada unilateralmente sem direito a restituição retroativa.
                </p>
                <div className="flex gap-4">
                  <a href="#rules" className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:underline flex items-center gap-1">
                    Ver regras completas de conformidade <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a href="#support" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:underline flex items-center gap-1">
                    Central de Ajuda de Parceiros <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* TERMS MODAL (STEP 1 DETAILS) */}
      <AnimatePresence>
        {isTermsModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in" 
              onClick={() => setIsTermsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-gray-100 dark:border-white/10 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-600/10 px-2.5 py-0.5 rounded-md inline-block">Contrato de Licenciamento</span>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Termos de Parceria FacePhone Pay</h3>
                </div>
              </div>

              <div className="text-xs text-gray-600 dark:text-zinc-300 space-y-4 leading-relaxed font-medium">
                <p>
                  Por favor, leia atentamente esses Termos do Programa de Parceria de Monetização (YPP) da rede FacePhone, regulada pelas diretrizes oficiais do FacePhone Pay S.A.
                </p>

                <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl space-y-3 font-semibold text-[11px] dark:text-zinc-400">
                  <p>
                    <span className="text-red-500 font-bold block uppercase text-[10px] tracking-wider">1. Divisão Líquida de Receitas Publicitárias</span>
                    O criador qualificado fará jus ao percentual de 55% da receita líquida comprovadamente arrecadada pela FacePhone com anúncios exibidos no player de seus vídeos ou no carrossel de transição entre Reels.
                  </p>
                  <p>
                    <span className="text-red-500 font-bold block uppercase text-[10px] tracking-wider">2. Liquidação de Saldos na Wallet</span>
                    Os repasses financeiros calculados no encerramento de cada dia útil de aferição de visualizações (views) serão creditados em USDT (TRC-20) ou diretamente na conta em Kwanzas. O FacePhone S.A. é o agente de pagamento legal.
                  </p>
                  <p>
                    <span className="text-red-500 font-bold block uppercase text-[10px] tracking-wider">3. Padrões de Qualidade e Integridade</span>
                    O criador de conteúdo assegura que todas as produções publicadas são de propriedade intelectual própria, abstendo-se de re-upload de canais internacionais (falsos cortes) ou mídias não autorizadas sem prévia alteração expressiva.
                  </p>
                  <p>
                    <span className="text-red-500 font-bold block uppercase text-[10px] tracking-wider">4. Sistema de Advertência e Banimento (Strikes)</span>
                    A ocorrência de 3 strikes de violação de termos em um período acumulado de 180 dias implicará no cancelamento sem direito de contestação para monetização futura desta e de qualquer conta assemelhada.
                  </p>
                </div>

                <p className="text-[10px] italic">
                  Ao clicar em "Aceitar e Assinar Acordo", você vincula juridicamente sua identidade FacePhone para o recebimento de proventos e aceita passar pelas avaliações técnicas da equipe.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-4">
                <label className="flex items-start gap-3.5 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={termsAcceptedCheckbox}
                    onChange={(e) => setTermsAcceptedCheckbox(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500 dark:border-white/10 dark:bg-white/5"
                  />
                  <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 select-none group-hover:text-gray-950 dark:group-hover:text-white transition-colors">
                    Li, entendi e concordo integralmente com todas as cláusulas de monetização do FacePhone.
                  </span>
                </label>

                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setIsTermsModalOpen(false)}
                    className="px-6 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Recusar
                  </button>
                  <button 
                    disabled={!termsAcceptedCheckbox}
                    onClick={handleAcceptTerms}
                    className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      termsAcceptedCheckbox 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl hover:-translate-y-0.5' 
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    Aceitar e Assinar Acordo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Quick custom components inside as required
const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <span className={className}>❤️</span>
);

export default MonetizationPage;
