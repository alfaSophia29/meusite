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
  Percent,
  Settings,
  Plus,
  Trash2,
  X,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateUserData, getProducts } from '../services/storageService';

interface MonetizationPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => Promise<void>;
}

type ActiveTab = 'earn' | 'levels' | 'goals' | 'process' | 'safety';

export const MonetizationPage: React.FC<MonetizationPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('earn');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [complianceActiveSection, setComplianceActiveSection] = useState<'original' | 'community' | 'copyright' | 'tax' | 'auditing'>('original');
  const [termsAcceptedCheckbox, setTermsAcceptedCheckbox] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active configurations panel
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [isSavingFeature, setIsSavingFeature] = useState(false);

  // Config States for Video Ads
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [videoFormatSkippable, setVideoFormatSkippable] = useState(true);
  const [videoFormatNonSkippable, setVideoFormatNonSkippable] = useState(false);
  const [videoFormatOverlay, setVideoFormatOverlay] = useState(true);
  const [videoFrequency, setVideoFrequency] = useState(180);

  // Config States for Reels Ads
  const [reelsEnabled, setReelsEnabled] = useState(true);
  const [reelsOverlay, setReelsOverlay] = useState(true);
  const [reelsSticker, setReelsSticker] = useState(false);

  // Config States for Channel Club
  const [clubEnabled, setClubEnabled] = useState(false);
  const [clubTiers, setClubTiers] = useState<Array<{ name: string; price: number; perk: string }>>([]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState(1500);
  const [newTierPerk, setNewTierPerk] = useState('Conteúdo Exclusivo');

  // Config States for Supers / Support
  const [supersEnabled, setSupersEnabled] = useState(true);
  const [supersMinAmount, setSupersMinAmount] = useState(2);
  const [supersHighlightColor, setSupersHighlightColor] = useState('blue');

  // Config States for Shop Product Showcase
  const [shoppingEnabled, setShoppingEnabled] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);
  const [myStoreProducts, setMyStoreProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  // Compliance tracking status definitions
  const strikesCount = currentUser.creatorStats?.strikes || 0;
  let communityScore = 100;
  let communityStatusLabel = "Excelente (0 de 3 Strikes)";
  let communityColorClass = "from-emerald-500 to-emerald-600";
  let communityBgColor = "bg-emerald-500/10";
  let communityTextColor = "text-emerald-650 dark:text-emerald-400";
  let communityDescription = "Conformidade total com as Diretrizes da Comunidade do FacePhone. Conta livre de restrições ou condutas abusivas.";

  if (strikesCount === 1) {
    communityScore = 66;
    communityStatusLabel = "Atenção (1 de 3 Strikes)";
    communityColorClass = "from-amber-500 to-amber-600";
    communityBgColor = "bg-amber-500/10";
    communityTextColor = "text-amber-500";
    communityDescription = "Aviso ativo recebido por comportamento inadequado ou disputa leve. Evite novas infrações.";
  } else if (strikesCount === 2) {
    communityScore = 33;
    communityStatusLabel = "Risco Crítico (2 de 3 Strikes)";
    communityColorClass = "from-orange-500 to-red-500";
    communityBgColor = "bg-orange-500/10";
    communityTextColor = "text-orange-500";
    communityDescription = "Sua conta está sob aviso sério. Um terceiro strike resultará no banimento completo da monetização.";
  } else if (strikesCount >= 3) {
    communityScore = 0;
    communityStatusLabel = "Suspenso por Violação (3+ Strikes)";
    communityColorClass = "from-red-650 to-red-800";
    communityBgColor = "bg-red-550/10";
    communityTextColor = "text-red-500";
    communityDescription = "Sua elegibilidade de monetização foi revogada temporariamente por exceder os limites de conduta.";
  }

  const monetizationStatus = currentUser.monetizationStatus || 'NOT_STARTED';
  let qualityScore = 92; // default high AI estimation score based on healthy system metrics
  let qualityStatusLabel = "Excelente (Alta Originalidade)";
  let qualityColorClass = "from-red-600 to-rose-600";
  let qualityBgColor = "bg-red-550/10";
  let qualityTextColor = "text-red-650 dark:text-red-400";
  let qualityDescription = "Análise automática por IA indica alto nível de originalidade visual. Conteúdo livre de pirataria ou spam.";

  if (isMonetized) {
    qualityScore = 100;
    qualityStatusLabel = "Verificação Concluída (100%)";
    qualityColorClass = "from-emerald-500 to-teal-500";
    qualityBgColor = "bg-emerald-500/10";
    qualityTextColor = "text-emerald-500";
    qualityDescription = "Aprovado e homologado pela comissão técnica. Atende perfeitamente aos critérios de adequação de marcas.";
  } else if (monetizationStatus === 'PENDING') {
    qualityScore = 80;
    qualityStatusLabel = "Sob Auditoria de Conteúdo";
    qualityColorClass = "from-amber-600 to-orange-500";
    qualityBgColor = "bg-amber-500/10";
    qualityTextColor = "text-amber-500";
    qualityDescription = "Banca avaliadora analisando seus vídeos de maior engajamento e histórico de originalidade visual manual.";
  } else if (monetizationStatus === 'REJECTED') {
    qualityScore = 40;
    qualityStatusLabel = "Necessita de Ajustes Críticos";
    qualityColorClass = "from-red-500 to-rose-550";
    qualityBgColor = "bg-red-500/10";
    qualityTextColor = "text-red-500";
    qualityDescription = "O canal possui repetições excessivas ou trechos não originais (re-upload). Corrija e reaplique em 30 dias.";
  }

  const idStatus = currentUser.idVerificationStatus || 'NOT_STARTED';
  let taxScore = 10;
  let taxStatusLabel = "Requer Cadastrar BI/NIF";
  let taxColorClass = "from-zinc-400 to-zinc-500";
  let taxBgColor = "bg-zinc-500/10";
  let taxTextColor = "text-zinc-500";
  let taxDescription = "Cadastre o seu Bilhete de Identidade e NIF para habilitar saques. Exigência legal regulada pela AGT angolana.";

  if (idStatus === 'APPROVED') {
    taxScore = 100;
    taxStatusLabel = "Documentação Fiscal Aprovada";
    taxColorClass = "from-emerald-500 to-teal-500";
    taxBgColor = "bg-emerald-500/10";
    taxTextColor = "text-emerald-500";
    taxDescription = "Tudo em ordem. Seu NIF angolano e crachá de identificação estão vinculados e validados para saques ilimitados.";
  } else if (idStatus === 'PENDING') {
    taxScore = 50;
    taxStatusLabel = "BI & Selfie Sob Análise";
    taxColorClass = "from-yellow-500 to-amber-500";
    taxBgColor = "bg-yellow-500/10";
    taxTextColor = "text-yellow-650 dark:text-yellow-400";
    taxDescription = "Documentos recebidos pela banca fiscalizadora. Verificação de autenticidade contra lavagem de dinheiro em andamento.";
  } else if (idStatus === 'REJECTED') {
    taxScore = 20;
    taxStatusLabel = "Documentação Rejeitada";
    taxColorClass = "from-red-500 to-rose-500";
    taxBgColor = "bg-red-500/10";
    taxTextColor = "text-red-500";
    taxDescription = "Os documentos enviados não conferem ou a foto do BI está inelegível. Faça o reenvio no painel de Ajustes.";
  }

  const overallComplianceScore = Math.round((communityScore + qualityScore + taxScore) / 3);

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

  const handleOpenSettings = async (id: string) => {
    setEditingFeature(id);
    const feats = currentUser.monetizationFeatures || {};
    if (id === 'video-ads') {
      setVideoEnabled(feats.videoAdsEnabled ?? true);
      setVideoFormatSkippable(feats.videoAdFormatSkippable ?? true);
      setVideoFormatNonSkippable(feats.videoAdFormatNonSkippable ?? false);
      setVideoFormatOverlay(feats.videoAdFormatOverlay ?? true);
      setVideoFrequency(feats.videoAdFrequency ?? 180);
    } else if (id === 'reels-ads') {
      setReelsEnabled(feats.reelsAdsEnabled ?? true);
      setReelsOverlay(feats.reelsAdFormatOverlay ?? true);
      setReelsSticker(feats.reelsAdFormatSticker ?? false);
    } else if (id === 'club') {
      setClubEnabled(feats.clubEnabled ?? false);
      setClubTiers(feats.clubTiers ?? [
        { name: 'Membro Bronze', price: 1500, perk: 'Selo de fidelidade exclusivo' },
        { name: 'Fã de Prata', price: 3500, perk: 'Chat e grupo privado' },
        { name: 'Clã Real', price: 10000, perk: 'Respostas e conteúdos de bastidores' }
      ]);
    } else if (id === 'supers') {
      setSupersEnabled(feats.supersEnabled ?? true);
      setSupersMinAmount(feats.supersMinAmount ?? 2);
      setSupersHighlightColor(feats.supersHighlightColor ?? 'blue');
    } else if (id === 'shopping') {
      setShoppingEnabled(feats.shoppingEnabled ?? false);
      setFeaturedProducts(feats.shoppingFeaturedProductIds ?? []);
      
      setLoadingProducts(true);
      try {
        const result = await getProducts(50, undefined, currentUser.storeId || currentUser.id);
        setMyStoreProducts(result.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const handleSaveFeatureSettings = async () => {
    setIsSavingFeature(true);
    try {
      const currentFeats = currentUser.monetizationFeatures || {};
      let updatedFeats = { ...currentFeats };

      if (editingFeature === 'video-ads') {
        updatedFeats = {
          ...updatedFeats,
          videoAdsEnabled: videoEnabled,
          videoAdFormatSkippable: videoFormatSkippable,
          videoAdFormatNonSkippable: videoFormatNonSkippable,
          videoAdFormatOverlay: videoFormatOverlay,
          videoAdFrequency: videoFrequency
        };
      } else if (editingFeature === 'reels-ads') {
        updatedFeats = {
          ...updatedFeats,
          reelsAdsEnabled: reelsEnabled,
          reelsAdFormatOverlay: reelsOverlay,
          reelsAdFormatSticker: reelsSticker
        };
      } else if (editingFeature === 'club') {
        updatedFeats = {
          ...updatedFeats,
          clubEnabled: clubEnabled,
          clubTiers: clubTiers
        };
      } else if (editingFeature === 'supers') {
        updatedFeats = {
          ...updatedFeats,
          supersEnabled: supersEnabled,
          supersMinAmount: Number(supersMinAmount),
          supersHighlightColor: supersHighlightColor
        };
      } else if (editingFeature === 'shopping') {
        updatedFeats = {
          ...updatedFeats,
          shoppingEnabled: shoppingEnabled,
          shoppingFeaturedProductIds: featuredProducts
        };
      }

      await updateUserData(currentUser.id, {
        monetizationFeatures: updatedFeats
      });
      await refreshUser();
      showToast("Configuração de monetização atualizada com sucesso!");
      setEditingFeature(null);
    } catch (err) {
      console.error(err);
      showToast("Falha ao atualizar configurações.");
    } finally {
      setIsSavingFeature(false);
    }
  };

  const userLevel = followersCount >= 100000 ? 4 :
                    followersCount >= 10000 ? 3 :
                    followersCount >= 1000 ? 2 : 1;

  const waysToEarn = [
    {
      id: "video-ads",
      title: "Anúncios da Página de Exibição",
      desc: "Gere receita com anúncios e visualizações premium do FacePhone nas publicações de longa duração.",
      status: isMonetized && userLevel >= 3 ? "Ativo" : (userLevel < 3 ? "Requer Nível 3 (10K)" : "Aguardando Aprovação"),
      unlocked: isMonetized && userLevel >= 3,
      details: "Os anúncios de vídeo e display são veiculados antes, durante ou depois dos seus uploads em formato largo.",
      color: "bg-red-500",
      icon: Play
    },
    {
      id: "reels-ads",
      title: "Anúncios do Feed de Reels",
      desc: "Ganhe com a divisão de publicidade em loop intercalada entre os vídeos dinâmicos do seu Reels.",
      status: isMonetized && userLevel >= 3 ? "Ativo" : (userLevel < 3 ? "Requer Nível 3 (10K)" : "Aguardando Aprovação"),
      unlocked: isMonetized && userLevel >= 3,
      details: "Os anúncios de transição de Reels compartilham receita proporcional às visualizações que seu perfil gera.",
      color: "bg-amber-500",
      icon: Video
    },
    {
      id: "club",
      title: "Clubes de Canais (Membros)",
      desc: "Crie níveis extras pagos mensalmente onde seus maiores fãs ganham selos e chats exclusivos.",
      status: isMonetized && userLevel >= 2 ? "Ativo" : (userLevel < 2 ? "Requer Nível 2 (1K)" : "Aguardando Aprovação"),
      unlocked: isMonetized && userLevel >= 2,
      details: "Fidelize sua audiência cobrando valores em Kwanzas ou USDT por conteúdo de bastidores.",
      color: "bg-emerald-500",
      icon: Users
    },
    {
      id: "supers",
      title: "Super Chats e Supers",
      desc: "Fãs apoiam diretamente sua conta com pagamentos avulsos de destaque nas lives ou posts.",
      status: isMonetized && userLevel >= 2 ? "Ativo" : (userLevel < 2 ? "Requer Nível 2 (1K)" : "Aguardando Aprovação"),
      unlocked: isMonetized && userLevel >= 2,
      details: "Mensagens compradas que ficam fixadas no topo do chat de transmissões ou destaque nos comentários.",
      color: "bg-blue-500",
      icon: HeartIcon
    },
    {
      id: "shopping",
      title: "Shopping do Criador",
      desc: "Vincule produtos físicos ou infoprodutos da sua loja FacePhone diretamente nas mídias.",
      status: isMonetized && userLevel >= 3 ? "Ativo" : (userLevel < 3 ? "Requer Nível 3 (10K)" : "Aguardando Aprovação"),
      unlocked: isMonetized && userLevel >= 3,
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
            { id: 'levels', label: 'Níveis de Monetização', icon: Award },
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
                            item.unlocked ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/5' : 'bg-red-500/10 text-red-500 border border-red-500/5 animate-pulse'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-base font-black text-gray-950 dark:text-white uppercase tracking-tight">{item.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic flex items-start gap-1">
                          <Info className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                          <span>{item.details}</span>
                        </span>

                        {item.unlocked && (
                          <button 
                            onClick={() => handleOpenSettings(item.id)}
                            className="w-full mt-2 py-2.5 bg-red-600/15 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white text-red-600 dark:text-red-500 rounded-2xl active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                          >
                            <Settings className="h-3.5 w-3.5" /> Configurar & Ativar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: MONETIZATION LEVELS */}
          {activeTab === 'levels' && (
            <div className="space-y-10 animate-fade-in">
              <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-600/10 px-3 py-1 rounded-full">Seu Progresso Atual</span>
                    <h3 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-white uppercase tracking-tight">
                      {followersCount >= 100000 ? 'Lenda do Ecossistema (Nível 4)' :
                       followersCount >= 10000 ? 'Estrela do FacePhone (Nível 3)' :
                       followersCount >= 1000 ? 'Criador Crescente (Nível 2)' :
                       'Membro Aspirante (Nível 1)'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xl font-medium leading-relaxed">
                      Sua conta evolui conforme sua comunidade cresce. Continue publicando ótimos Reels e vídeos para destravar mais ferramentas financeiras e badges de destaque.
                    </p>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-3xl min-w-[240px] text-center space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Sua Audiência</span>
                    <p className="text-4xl font-black tracking-tight text-red-600 dark:text-red-500">{followersCount.toLocaleString()}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-widest">
                      {followersCount >= 100000 ? 'Nível Máximo Atingido!' :
                       followersCount >= 10000 ? `Faltam ${(100000 - followersCount).toLocaleString()} para o Nível 4` :
                       followersCount >= 1000 ? `Faltam ${(10000 - followersCount).toLocaleString()} para o Nível 3` :
                       `Faltam ${(1000 - followersCount).toLocaleString()} para o Nível 2`}
                    </p>
                  </div>
                </div>

                {/* Level Progress Line */}
                <div className="relative pt-6 z-10 space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <span>Nível 1 (Aspirante)</span>
                    <span className={followersCount >= 1000 ? 'text-red-500' : ''}>Nível 2 (1K)</span>
                    <span className={followersCount >= 10000 ? 'text-red-500' : ''}>Nível 3 (10K)</span>
                    <span className={followersCount >= 100000 ? 'text-red-500' : ''}>Nível 4 (100K)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/5 p-0.5 overflow-hidden font-sans">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 to-rose-700 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${
                          followersCount >= 100000 ? 100 :
                          followersCount >= 10000 ? 66 + ((followersCount - 10000) / 90000) * 34 :
                          followersCount >= 1000 ? 33 + ((followersCount - 1000) / 9000) * 33 :
                          (followersCount / 1000) * 33
                        }%` 
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Levels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                {[
                  {
                    level: 1,
                    title: 'Membro Aspirante (Nível 1)',
                    req: 'Sua conta inicial no FacePhone',
                    badge: 'Bronze',
                    color: 'border-amber-700/20 bg-gradient-to-b from-amber-700/[0.02]',
                    badgeColor: 'bg-amber-700/10 text-amber-700 border-amber-700/15',
                    perks: [
                      'Anúncios de Vídeo na Página de Exibição (após qualificação básica)',
                      'Anúncios e receitas nativas do feed de Reels',
                      'Configurações padrão de criador'
                    ],
                    unlocked: true
                  },
                  {
                    level: 2,
                    title: 'Criador Crescente (Nível 2)',
                    req: 'Requer mais de 1.000 seguidores',
                    badge: 'Prata',
                    color: followersCount >= 1000 
                      ? 'border-slate-400/20 bg-gradient-to-b from-slate-400/[0.02]' 
                      : 'border-gray-200 opacity-60',
                    badgeColor: 'bg-slate-400/10 text-slate-500 dark:text-slate-300 border-slate-400/15',
                    perks: [
                      'Inscrições Auxiliares de Membros (Clubes de Canais)',
                      'Super Chats em Transmissões ao Vivo',
                      'Mensagens em Destaque recomendadas',
                      'Badge oficial de nível Prata exposto no perfil'
                    ],
                    unlocked: followersCount >= 1000
                  },
                  {
                    level: 3,
                    title: 'Estrela do FacePhone (Nível 3)',
                    req: 'Requer mais de 10.000 seguidores',
                    badge: 'Ouro',
                    color: followersCount >= 10000 
                      ? 'border-yellow-500/20 bg-gradient-to-b from-yellow-500/[0.02]' 
                      : 'border-gray-200 opacity-60',
                    badgeColor: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/15',
                    perks: [
                      'Sincronização do Shopping do Criador e vendas integradas',
                      'Acesso a ferramentas de links afiliados nativos',
                      'Comissão extra de +10% em vendas de produtos selecionados',
                      'Destaque no algoritmo de recomendações recomendadas'
                    ],
                    unlocked: followersCount >= 10000
                  },
                  {
                    level: 4,
                    title: 'Lenda do Ecossistema (Nível 4)',
                    req: 'Requer mais de 100.000 seguidores',
                    badge: 'Diamante',
                    color: followersCount >= 100000 
                      ? 'border-blue-500/20 bg-gradient-to-b from-blue-500/[0.02]' 
                      : 'border-gray-200 opacity-60',
                    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15',
                    perks: [
                      'Acesso antecipado a novas funcionalidades financeiras',
                      'Suporte Executivo 24/7 e Gerente de Contas Individual',
                      'Taxa de repasse de USDT/Kwanza de publicidade acelerada',
                      'Crachá especial e participação nos comitês internos do FacePhone'
                    ],
                    unlocked: followersCount >= 100000
                  }
                ].map((tier, idx) => (
                  <div 
                    key={idx}
                    className={`p-6 rounded-[2rem] border relative overflow-hidden transition-all duration-300 ${tier.color} ${
                      tier.unlocked ? 'dark:border-white/15' : 'dark:border-white/5 border-dashed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border ${tier.badgeColor}`}>
                          Selo {tier.badge}
                        </span>
                        <h4 className="text-lg font-black uppercase tracking-tight text-gray-950 dark:text-white mt-2">{tier.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{tier.req}</p>
                      </div>

                      <div className={`p-2.5 rounded-xl ${tier.unlocked ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'}`}>
                        {tier.unlocked ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Lock className="h-5 w-5 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">Recursos e Benefícios:</h5>
                      <ul className="space-y-2 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        {tier.perks.map((perk, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2.5">
                            <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${tier.unlocked ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="leading-relaxed">{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
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
              
              {/* COMPLIANCE STATUS TRACKER DASHBOARD */}
              <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-650/[0.01] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 bg-red-600/10 px-2.5 py-0.5 rounded-md inline-block">Métricas de Parceria</span>
                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-950 dark:text-white flex items-center gap-2">
                       Acompanhamento de Conformidade
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Mantenha os seus níveis altos para garantir saques diretos e comissão integral.</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-3 rounded-2xl">
                    <div className="text-right">
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-400 block leading-tight">Média de Risco</span>
                      <span className={`text-[11px] font-black uppercase ${overallComplianceScore >= 80 ? 'text-emerald-500' : overallComplianceScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {overallComplianceScore >= 80 ? 'Excelente / Seguro' : overallComplianceScore >= 50 ? 'Atenção / Regular' : 'Fora de Conformidade'}
                      </span>
                    </div>
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed border-red-600/20">
                      <span className="text-base font-mono font-black text-red-600 dark:text-red-500">{overallComplianceScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* BAR 1: Community Guidelines */}
                  <div className="space-y-2 p-4.5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${communityBgColor} ${communityTextColor}`}>
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-gray-950 dark:text-white tracking-tight">Diretrizes da Comunidade</h4>
                          <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Strikes e Denúncias Sociais</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${communityBgColor} ${communityTextColor}`}>
                          {communityStatusLabel}
                        </span>
                        <span className="text-xs font-mono font-black text-gray-900 dark:text-white">{communityScore}%</span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-white/5 p-0.5 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${communityColorClass} rounded-full transition-all duration-1000`} 
                        style={{ width: `${communityScore}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-semibold max-w-2xl">{communityDescription}</p>
                      {strikesCount > 0 && (
                        <button 
                          onClick={() => {
                            setComplianceActiveSection('community');
                            setIsComplianceModalOpen(true);
                          }}
                          className="text-[10px] font-black uppercase text-red-600 dark:text-red-500 underline shrink-0 cursor-pointer"
                        >
                          Ver Strike
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BAR 2: Content Quality */}
                  <div className="space-y-2 p-4.5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${qualityBgColor} ${qualityTextColor}`}>
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-gray-950 dark:text-white tracking-tight">Qualidade e Originalidade</h4>
                          <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Detecção de IA & Auditoria da Banca</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${qualityBgColor} ${qualityTextColor}`}>
                          {qualityStatusLabel}
                        </span>
                        <span className="text-xs font-mono font-black text-gray-900 dark:text-white">{qualityScore}%</span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-white/5 p-0.5 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${qualityColorClass} rounded-full transition-all duration-1000`} 
                        style={{ width: `${qualityScore}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-semibold max-w-2xl">{qualityDescription}</p>
                      <button 
                        onClick={() => {
                          setComplianceActiveSection('original');
                          setIsComplianceModalOpen(true);
                        }}
                        className="text-[10px] font-black uppercase text-red-600 dark:text-red-500 underline shrink-0 cursor-pointer"
                      >
                        Ver Diretrizes
                      </button>
                    </div>
                  </div>

                  {/* BAR 3: Tax Documentation */}
                  <div className="space-y-2 p-4.5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${taxBgColor} ${taxTextColor}`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-gray-950 dark:text-white tracking-tight">Documentação Fiscal e Cadastral</h4>
                          <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">NIF Angolano e BI (AGT Compliance)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${taxBgColor} ${taxTextColor}`}>
                          {taxStatusLabel}
                        </span>
                        <span className="text-xs font-mono font-black text-gray-900 dark:text-white">{taxScore}%</span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-white/5 p-0.5 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${taxColorClass} rounded-full transition-all duration-1000`} 
                        style={{ width: `${taxScore}%` }} 
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-semibold max-w-2xl">{taxDescription}</p>
                      {idStatus !== 'APPROVED' ? (
                        <button 
                          onClick={() => onNavigate('settings')}
                          className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-[9px] font-mono font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 cursor-pointer shadow-md inline-flex items-center gap-1.5 border-none"
                        >
                          <Settings className="h-3 w-3" /> Completar NIF/BI
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setComplianceActiveSection('tax');
                            setIsComplianceModalOpen(true);
                          }}
                          className="text-[10px] font-black uppercase text-red-600 dark:text-red-500 underline shrink-0 cursor-pointer"
                        >
                          Exibir Regras NIF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => {
                      setComplianceActiveSection('original');
                      setIsComplianceModalOpen(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500 hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Ver regras completas de conformidade <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      setComplianceActiveSection('auditing');
                      setIsComplianceModalOpen(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Central de Ajuda de Parceiros <ExternalLink className="h-3.5 w-3.5" />
                  </button>
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

      {/* COMPLIANCE RULES MODAL */}
      <AnimatePresence>
        {isComplianceModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in" 
              onClick={() => setIsComplianceModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col max-h-[85vh] z-[1001] overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-white/5 pb-4 shrink-0">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-650 bg-red-600/10 px-2.5 py-0.5 rounded-md inline-block font-mono">Regulamento Operacional</span>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Regras de Conformidade & Políticas do Criador</h3>
                </div>
                <button 
                  onClick={() => setIsComplianceModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-full bg-zinc-100 dark:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body Layout - Left Sidebar, Right Content */}
              <div className="flex flex-col md:flex-row gap-6 mt-6 flex-1 overflow-hidden">
                {/* Sidebar Menu */}
                <div className="w-full md:w-60 flex flex-row md:flex-col gap-2 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 pb-4 md:pb-0 md:pr-4 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'original', label: 'Originalidade', desc: 'Reposts, Reacts e IA', icon: Award },
                    { id: 'community', label: 'Comunidade', desc: 'Conduta e Diretrizes', icon: ShieldCheck },
                    { id: 'copyright', label: 'Direitos Autorais', desc: 'Músicas e Mídias', icon: Play },
                    { id: 'tax', label: 'Impostos e NIF', desc: 'Legalidade e Saques', icon: Percent },
                    { id: 'auditing', label: 'Banca e Prazos', desc: 'Critérios de Avaliação', icon: FileText }
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = complianceActiveSection === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setComplianceActiveSection(tab.id as any)}
                        className={`flex items-center gap-3 p-3 rounded-2xl w-auto md:w-full text-left transition-all shrink-0 border uppercase font-mono ${
                          isActive 
                            ? 'bg-red-600 border-red-600 text-white shadow-md' 
                            : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        <IconComp className="h-4.5 w-4.5 shrink-0" />
                        <div className="hidden md:block leading-tight text-left">
                          <p className="text-[10px] font-black">{tab.label}</p>
                          <p className={`text-[8.5px] font-semibold ${isActive ? 'text-red-100' : 'text-zinc-400 dark:text-zinc-500'}`}>{tab.desc}</p>
                        </div>
                        <span className="md:hidden text-[10px] font-black">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-6 text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-semibold">
                  {/* Category Content: ORIGINAL */}
                  {complianceActiveSection === 'original' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-1.5 border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-[10px] text-red-600 dark:text-red-500 font-bold uppercase tracking-widest font-mono">Diretriz de Propriedade Intelectual</span>
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Conteúdo Altamente Original vs. Re-upload</h4>
                      </div>

                      <p className="text-zinc-600 dark:text-zinc-400">
                        O FacePhone preza pela criatividade e pela conexão humana real. Canais focados unicamente na cópia de conteúdos de plataformas concorrentes ou canais internacionais serão retidos na fase de auditoria da banca.
                      </p>

                      <div className="p-4 bg-red-500/[0.02] border border-red-500/10 rounded-2xl space-y-3.5">
                        <h5 className="text-[10px] font-black uppercase text-red-650 dark:text-rose-400 tracking-wider">O que é Desqualificado Para Monetização:</h5>
                        <ul className="space-y-2 list-disc pl-4 text-[11px]">
                          <li><strong className="text-gray-900 dark:text-gray-100">Cortes sem Elemento Autoral:</strong> Repostar trechos de podcasts, lives de terceiros ou novelas de televisão sem nenhum tipo de edição de vídeo, comentários ativos na tela ou efeitos significativos.</li>
                          <li><strong className="text-gray-900 dark:text-gray-100">Compilações de Redes Sociais:</strong> Juntar vários pequenos vídeos do Reels/TikTok que não foram produzidos por você, mesmo sob a máscara de "melhores do dia".</li>
                          <li><strong className="text-gray-900 dark:text-gray-100">Vozes Sintéticas sem Roteiro Exclusivo:</strong> Vídeos gerados de maneira automatizada onde texto comum da internet é lido por vozes artificiais repetitivas em cima de vídeos ilustrativos genéricos de stock.</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl space-y-3.5">
                        <h5 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Abordagens Permitidas e Incentivadas:</h5>
                        <ul className="space-y-2 list-disc pl-4 text-[11px]">
                          <li><strong className="text-gray-900 dark:text-gray-100">Reacts Genuínos (Reações):</strong> Vídeos onde a sua face e comentários em áudio ocupam espaço em tela e você provê críticas reais, piadas autorais ou agrega informações didáticas adicionais ao vídeo original.</li>
                          <li><strong className="text-gray-900 dark:text-gray-100">Tutoriais e Narrativas:</strong> Materiais criados de ponta a ponta com a sua própria voz, demonstrando experiências reais com produtos, ensinando lógica de software, culinária ou comentando notícias com profundidade analítica.</li>
                          <li><strong className="text-gray-900 dark:text-gray-100">Humor e Paródias:</strong> Gravação e dublagem de esquetes que criam um novo conceito artístico inovador sobre áudios virais de terceiros.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Category Content: COMMUNITY */}
                  {complianceActiveSection === 'community' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-1.5 border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-[10px] text-red-600 dark:text-red-500 font-bold uppercase tracking-widest font-mono">Diretrizes da Comunidade</span>
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Conduta Social, Fraudes e Integridade de Métricas</h4>
                      </div>

                      <p className="text-zinc-600 dark:text-zinc-400">
                        A rede FacePhone integra um ambiente social com canais de finanças em USDT e moedas locais. Por este motivo, possuímos tolerância zero para práticas que coloquem em risco a saúde financeira e mental dos nossos utilizadores.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl space-y-2">
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-white">Proibido: Pirâmides & Golpes</h5>
                          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Promover pirâmides financeiras, bots automatizados de opções binárias fraudulentas ou promessas de enriquecimento garantido sem regulação das autoridades angolanas resultará em banimento e bloqueio judicial do saldo disponível.
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl space-y-2">
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-white">Proibido: Manipulação de Views</h5>
                          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Fazer uso de bots de visualização, participar de comunidades de "clique por clique" ou forçar visualizadores a interagir repetidamente nos anúncios do player inviabilizará permanentemente a sua conta para receber pagamentos.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-500/[0.02] border border-amber-500/10 rounded-2xl flex gap-3 text-[11px]">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                          <strong className="text-gray-900 dark:text-white uppercase tracking-wider text-[9px] block">O Sistema de 3 Strikes</strong>
                          <span>Qualquer quebra grave das diretrizes resulta no recebimento de 1 Strike de Monetização. Se acumular 3 strikes válidos no período ativo de 180 dias, a conta será revogada por 1 ano sem possibilidade de estorno de rendimentos retidos de publicações em andamento.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Content: COPYRIGHT */}
                  {complianceActiveSection === 'copyright' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-1.5 border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-[10px] text-red-600 dark:text-red-500 font-bold uppercase tracking-widest font-mono">Uso de Mídia Sob Direitos Autorais</span>
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Regras de Áudio e Músicas Comerciais</h4>
                      </div>

                      <p className="text-zinc-600 dark:text-zinc-400">
                        Para garantir que as marcas continuem injetando verbas de publicidade na plataforma, todos os materiais sob licenças rígidas de gravadoras musicais devem obedecer ao nosso sistema integrado de reivindicação de direitos (Copyright Claims).
                      </p>

                      <div className="space-y-3 font-semibold text-[11px]">
                        <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200/50 dark:border-white/5 rounded-2xl">
                          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                            <Percent className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-900 dark:text-white font-black uppercase text-[10px] tracking-wider block">1. Divisão Automática de Royalties</span>
                            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">Quando uma música registrada por um grande estúdio é identificada no vídeo, até 50% dos lucros do anúncio desse post específico podem ser redirecionados de maneira automatizada para o detentor oficial da obra intelectual.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200/50 dark:border-white/5 rounded-2xl">
                          <div className="p-2 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                            <X className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-900 dark:text-white font-black uppercase text-[10px] tracking-wider block">2. Silenciamento e Exclusão</span>
                            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">Materiais de áudio contendo canções sob restrição de veto total do produtor serão automaticamente silenciados em nível de player pela nossa API de segurança para manter seu canal operacional.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200/50 dark:border-white/5 rounded-2xl">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-900 dark:text-white font-black uppercase text-[10px] tracking-wider block">3. Biblioteca de Estúdio FacePhone (Grátis & Monetizado)</span>
                            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">Sempre prefira usar as trilhas marcadas como "Livres do Painel" ou músicas da FacePhone Media para reter a fatia integral de 55% de repasse promocional sem restrições de distribuição.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Content: TAX */}
                  {complianceActiveSection === 'tax' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-1.5 border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-[10px] text-red-600 dark:text-red-500 font-bold uppercase tracking-widest font-mono">Gestão Tributária & Liquidação Financeira</span>
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Obrigações Fiscais em Angola & Conversão USDT</h4>
                      </div>

                      <p className="text-zinc-600 dark:text-zinc-400">
                        Como uma plataforma financeiramente responsável amparada pelo FacePhone Pay, operamos sob as regulações da AGT angolana e as normas internacionais de combate a lavagem de dinheiro da Web3.
                      </p>

                      <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl space-y-4 font-semibold text-[11px] text-zinc-650 dark:text-zinc-350">
                        <div className="space-y-1">
                          <span className="text-rose-500 font-bold block uppercase text-[10px] tracking-wider">Declaração de NIF e Bilhete de Identidade</span>
                          <span>Todos os parceiros cujo rendimento mensal ultrapassar 50.000 Kwanzas acumulados na carteira FacePhone Pay devem preencher detalhadamente seu NIF e foto do Bilhete de Identidade (BI) no painel de Ajustes de Perfil. Sem isso, os saques ficarão retidos na banca de liquidação por conformidade.</span>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
                          <span className="text-rose-500 font-bold block uppercase text-[10px] tracking-wider">Retenção na Fonte (AGT)</span>
                          <span>De acordo com a legislação angolana sobre autopromoção digital e influenciadores digitais, o FacePhone Pay efetua a autodeclaração e relatórios para fins estatísticos fiscais com base nos lucros consolidados periódicos dos criadores.</span>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
                          <span className="text-rose-500 font-bold block uppercase text-[10px] tracking-wider">Regras de Saque USDT Web3</span>
                          <span>Para pagamentos processados via USDT (Rede TRC-20), o criador assume total responsabilidade por informar um endereço válido e de propriedade própria. Transações efetuadas com endereços incorretos não sofrerão reembolsos fiscais ou operacionais.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Content: AUDITING */}
                  {complianceActiveSection === 'auditing' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-1.5 border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-[10px] text-red-600 dark:text-red-500 font-bold uppercase tracking-widest font-mono">Processo de Banca Avaliadora</span>
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Manual de Submissão, Prazos e Recursos</h4>
                      </div>

                      <p className="text-zinc-600 dark:text-zinc-400">
                        A aprovação das contas no Programa de Parceiros FacePhone não ocorre de maneira meramente robótica. Prezamos pela saúde da nossa audiência através de uma rigorosa revisão manual.
                      </p>

                      <div className="space-y-3.5 text-zinc-600 dark:text-zinc-400">
                        <p>
                          <strong className="text-gray-950 dark:text-white block uppercase tracking-wide text-[10px]">O que a equipe avalia manual e ativamente:</strong>
                          Buscamos verificar os 10 posts de maior engajamento do canal: originalidade visual, adequação do linguajar, tags correspondentes ao assunto real do vídeo, conformidade do perfil e veracidade de interações com o público (comentários construtivos).
                        </p>

                        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl text-[10.5px]">
                          <div className="space-y-1 pr-4 border-r border-gray-200 dark:border-white/5 min-w-[120px] shrink-0 text-center">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block font-mono">Tempo Médio</span>
                            <span className="text-xl font-black text-red-650 dark:text-red-500 font-mono">7-14 Dias</span>
                            <span className="text-[8.5px] text-zinc-400 block font-bold leading-none">úteis regulamentares</span>
                          </div>
                          <div className="space-y-1 leading-relaxed font-semibold">
                            <span className="font-bold text-gray-900 dark:text-white block">Decisão Pronta</span>
                            <span>Caso o canal possua violações leves de direitos de conteúdo ou áudio, a banca poderá indeferir a candidatura temporariamente. Você terá acesso aos motivos específicos e poderá solicitar nova revisão em exatamente 30 dias úteis.</span>
                          </div>
                        </div>

                        <p className="text-[10.5px] italic text-zinc-400 font-bold">
                          *Aprovado o canal, o criador ativa as configurações avançadas de anúncios imediatamente no painel em tempo de execução.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-3 justify-end shrink-0">
                <button 
                  onClick={() => setIsComplianceModalOpen(false)}
                  className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Entendido, Fechar Regulamentos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FEATURE CONFIGURATION MODAL */}
      <AnimatePresence>
        {editingFeature && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/75 backdrop-blur-md" 
              onClick={() => setEditingFeature(null)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl bg-white dark:bg-zinc-950 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-gray-100 dark:border-white/10 space-y-6 max-h-[85vh] overflow-y-auto z-[1001]"
            >
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-600/10 px-2.5 py-0.5 rounded-md inline-block">Configurador Oficial</span>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {editingFeature === 'video-ads' && "Anúncios de Vídeo"}
                    {editingFeature === 'reels-ads' && "Anúncios do Reels"}
                    {editingFeature === 'club' && "Clube de Canais (Membros)"}
                    {editingFeature === 'supers' && "Super Chats & Apoio"}
                    {editingFeature === 'shopping' && "Criador Shopping"}
                  </h3>
                </div>
                <button 
                  onClick={() => setEditingFeature(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-full bg-zinc-100 dark:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6 text-xs text-zinc-650 dark:text-zinc-350">
                {/* 1. VIDEO ADS */}
                {editingFeature === 'video-ads' && (
                  <div className="space-y-6 font-semibold">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Ativar Monetização de Vídeos</p>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-505">Insira anúncios automatizados do FacePhone Ads</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={videoEnabled}
                        onChange={(e) => setVideoEnabled(e.target.checked)}
                        className="h-6 w-11 rounded-full cursor-pointer appearance-none bg-zinc-200 dark:bg-zinc-800 checked:bg-emerald-500 border border-transparent transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-white after:transition-all checked:after:translate-x-5"
                      />
                    </div>

                    {videoEnabled && (
                      <div className="space-y-4 animate-fade-in text-left">
                        <p className="text-xs uppercase font-black tracking-wider text-red-500">Formatos do Bloco de Anúncios</p>
                        <div className="space-y-2.5">
                          {[
                            { label: "Anúncios em Vídeo Puláveis (TrueView)", desc: "Permitido ao espectador pular após 5 segundos", checked: videoFormatSkippable, set: setVideoFormatSkippable },
                            { label: "Anúncios em Vídeo Não-Puláveis (Bumper)", desc: "Anúncios de 15 segundos obrigatórios de alta rentabilidade", checked: videoFormatNonSkippable, set: setVideoFormatNonSkippable },
                            { label: "Banners Gráficos de Overlay", desc: "Cards translúcidos exibidos no terço inferior do reprodutor", checked: videoFormatOverlay, set: setVideoFormatOverlay }
                          ].map((fmt, idx) => (
                            <label key={idx} className="flex items-start gap-3 p-3 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.01] rounded-xl cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={fmt.checked} 
                                onChange={(e) => fmt.set(e.target.checked)}
                                className="mt-0.5 h-4.5 w-4.5 rounded border-gray-350 text-red-650 focus:ring-red-550 dark:border-white/10 dark:bg-white/5"
                              />
                              <div className="space-y-0.5">
                                <span className="text-gray-900 dark:text-white font-bold">{fmt.label}</span>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-550">{fmt.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs uppercase font-black tracking-wider text-red-500 font-mono">Frequência Automática de Inserção</p>
                          <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                            <span>Mais anúncios (30s)</span>
                            <span className="text-red-500 font-bold">{videoFrequency} segundos</span>
                            <span>Menos anúncios (300s)</span>
                          </div>
                          <input 
                            type="range" 
                            min="30" 
                            max="300" 
                            step="30"
                            value={videoFrequency}
                            onChange={(e) => setVideoFrequency(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 dark:bg-white/5 rounded-lg appearance-none cursor-pointer accent-red-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. REELS ADS */}
                {editingFeature === 'reels-ads' && (
                  <div className="space-y-6 font-semibold">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Ativar Anúncios de Reels</p>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-505 font-medium">Ganhe por cada loop de transição do Reels</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={reelsEnabled}
                        onChange={(e) => setReelsEnabled(e.target.checked)}
                        className="h-6 w-11 rounded-full cursor-pointer appearance-none bg-zinc-200 dark:bg-zinc-800 checked:bg-emerald-500 border border-transparent transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-white after:transition-all checked:after:translate-x-5"
                      />
                    </div>

                    {reelsEnabled && (
                      <div className="space-y-4 animate-fade-in text-left">
                        <p className="text-xs uppercase font-black tracking-wider text-red-500">Estilos de Anúncios Dinâmicos</p>
                        <div className="space-y-2.5">
                          {[
                            { label: "Banners Flutuantes de Overlay", desc: "Cards leves nas laterais do Reels", checked: reelsOverlay, set: setReelsOverlay },
                            { label: "Stickers Patrocinados Nativos", desc: "Simula badges/stickers divertidos recomendados pela marca", checked: reelsSticker, set: setReelsSticker }
                          ].map((fmt, idx) => (
                            <label key={idx} className="flex items-start gap-3 p-3 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.01] rounded-xl cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={fmt.checked} 
                                onChange={(e) => fmt.set(e.target.checked)}
                                className="mt-0.5 h-4.5 w-4.5 rounded border-gray-300 text-red-650 focus:ring-red-550 dark:border-white/10 dark:bg-white/5"
                              />
                              <div className="space-y-0.5">
                                <span className="text-gray-900 dark:text-white font-bold">{fmt.label}</span>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-550">{fmt.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CLUB MEMBERSHIP */}
                {editingFeature === 'club' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Habilitar Assinaturas de Membros</p>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-505 font-medium">Ofereça vantagens exclusivas a apoiadores pagos</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={clubEnabled}
                        onChange={(e) => setClubEnabled(e.target.checked)}
                        className="h-6 w-11 rounded-full cursor-pointer appearance-none bg-zinc-200 dark:bg-zinc-800 checked:bg-emerald-500 border border-transparent transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-white after:transition-all checked:after:translate-x-5"
                      />
                    </div>

                    {clubEnabled && (
                      <div className="space-y-4 animate-fade-in font-semibold">
                        <p className="text-xs uppercase font-black tracking-wider text-red-500 text-left">Seus Níveis de Assinatura Ativos</p>
                        
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {clubTiers.length === 0 ? (
                            <p className="text-[11px] text-zinc-400 text-center py-4 bg-zinc-150/10 dark:bg-white/[0.01] rounded-xl border border-dashed border-zinc-200 dark:border-white/5">Nenhum nível cadastrado. Adicione um abaixo!</p>
                          ) : (
                            clubTiers.map((tier, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200/50 dark:border-white/5 leading-relaxed text-left">
                                <div className="space-y-0.5 text-left">
                                  <span className="text-gray-900 dark:text-white font-black block">{tier.name}</span>
                                  <p className="text-[10px] text-red-650 dark:text-red-400 font-mono font-black">{tier.price.toLocaleString()} Kwanza / mês</p>
                                  <p className="text-[9.5px] text-zinc-400 font-medium">Benefício: {tier.perk}</p>
                                </div>
                                <button 
                                  onClick={() => setClubTiers(clubTiers.filter((_, tIdx) => tIdx !== idx))}
                                  className="p-2 text-red-500 hover:text-red-750 hover:bg-red-500/10 rounded-lg transition shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Membership Tier Form */}
                        <div className="p-4 bg-zinc-50/50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 rounded-2xl space-y-3">
                          <p className="text-[10px] uppercase font-black tracking-wider text-zinc-400 text-left">Criar Novo Nível de Apoio</p>
                          <div className="grid grid-cols-2 gap-3 text-left">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">Nome do Nível</label>
                              <input 
                                type="text" 
                                placeholder="ex: Fã Supremo" 
                                value={newTierName}
                                onChange={(e) => setNewTierName(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-gray-205 dark:border-white/10 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">Preço Mensal (AOA)</label>
                              <input 
                                type="number" 
                                placeholder="1500" 
                                value={newTierPrice}
                                onChange={(e) => setNewTierPrice(Number(e.target.value))}
                                className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-gray-205 dark:border-white/10 rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">Perk / Vantagem Principal</label>
                            <input 
                              type="text" 
                              placeholder="ex: Canal de voz no Discord e fotos do feed" 
                              value={newTierPerk}
                              onChange={(e) => setNewTierPerk(e.target.value)}
                              className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-gray-205 dark:border-white/10 rounded-lg text-xs"
                            />
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              if (!newTierName || !newTierPerk) {
                                showToast("Por favor preencha os dados do nível.");
                                return;
                              }
                              setClubTiers([...clubTiers, { name: newTierName, price: newTierPrice, perk: newTierPerk }]);
                              setNewTierName('');
                              setNewTierPrice(1500);
                              setNewTierPerk('Acesso Exclusivo');
                              showToast("Novo nível de clube adicionado à lista!");
                            }}
                            className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
                          >
                            <Plus className="h-4 w-4" /> Adicionar Nível à Lista
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SUPERS */}
                {editingFeature === 'supers' && (
                  <div className="space-y-6 font-semibold">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Habilitar Envio de Supers</p>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-505 font-medium">Ative mensagens pagas de destaque na comunidade</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={supersEnabled}
                        onChange={(e) => setSupersEnabled(e.target.checked)}
                        className="h-6 w-11 rounded-full cursor-pointer appearance-none bg-zinc-200 dark:bg-zinc-800 checked:bg-emerald-500 border border-transparent transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-white after:transition-all checked:after:translate-x-5"
                      />
                    </div>

                    {supersEnabled && (
                      <div className="space-y-4 animate-fade-in text-left">
                        <div className="space-y-1">
                          <label className="text-xs uppercase font-black tracking-wider text-red-500 block">Valor Mínimo Aceito ($ USDT)</label>
                          <input 
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={supersMinAmount}
                            onChange={(e) => setSupersMinAmount(Number(e.target.value))}
                            className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-202 dark:border-white/10 rounded-xl font-mono text-xs font-bold"
                          />
                          <p className="text-[10px] text-zinc-400">Pacotes de doação inferiores a este valor de liquidação serão rejeitados automaticamente.</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs uppercase font-black tracking-wider text-red-500 block">Estilo de Realce dos Comentários</p>
                          <div className="flex gap-2">
                            {[
                              { color: 'blue', hex: 'bg-blue-500' },
                              { color: 'amber', hex: 'bg-amber-500' },
                              { color: 'red', hex: 'bg-red-500' },
                              { color: 'emerald', hex: 'bg-emerald-500' },
                              { color: 'pink', hex: 'bg-pink-500' }
                            ].map((clr, idx) => (
                              <button 
                                key={idx}
                                type="button"
                                onClick={() => setSupersHighlightColor(clr.color)}
                                className={`h-8 w-11 rounded-xl transition ${clr.hex} ${
                                  supersHighlightColor === clr.color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. SHOPPING */}
                {editingFeature === 'shopping' && (
                  <div className="space-y-6 font-semibold">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Ativar Shopping nas Mídias</p>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-505 font-medium">Exiba e venda seus produtos em carrossel dinâmico</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={shoppingEnabled}
                        onChange={(e) => setShoppingEnabled(e.target.checked)}
                        className="h-6 w-11 rounded-full cursor-pointer appearance-none bg-zinc-200 dark:bg-zinc-800 checked:bg-emerald-500 border border-transparent transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-white after:transition-all checked:after:translate-x-5"
                      />
                    </div>

                    {shoppingEnabled && (
                      <div className="space-y-4 animate-fade-in text-left font-semibold">
                        <p className="text-xs uppercase font-black tracking-wider text-red-500 block animate-pulse">Selecione Produtos para Exibição</p>
                        
                        {loadingProducts ? (
                          <div className="text-center py-6 text-[11px] text-zinc-400 font-mono">Carregando catálogo do seu comércio...</div>
                        ) : myStoreProducts.length === 0 ? (
                          <div className="p-6 bg-zinc-150/10 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/5 rounded-2xl space-y-3.5 text-center">
                            <p className="text-xs text-zinc-550 dark:text-zinc-400">Nenhum produto cadastrado na sua loja virtual ainda!</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFeature(null);
                                onNavigate('manage-store');
                              }}
                              className="mx-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 justify-center active:scale-95 transition-all shadow-md"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" /> Adicionar Produtos na Loja
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {myStoreProducts.map((p, idx) => {
                              const isChecked = featuredProducts.includes(p.id);
                              return (
                                <label key={idx} className="flex justify-between items-center p-3.5 bg-zinc-50 dark:bg-[#0c0f17] border border-zinc-200/50 dark:border-white/5 rounded-xl cursor-pointer">
                                  <div className="flex items-center gap-2.5 text-left">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setFeaturedProducts(featuredProducts.filter(id => id !== p.id));
                                        } else {
                                          setFeaturedProducts([...featuredProducts, p.id]);
                                        }
                                      }}
                                      className="h-4.5 w-4.5 rounded text-red-600 focus:ring-red-500 dark:border-white/10 dark:bg-white/5"
                                    />
                                    {p.images && p.images[0] && (
                                      <img src={p.images[0]} referrerPolicy="no-referrer" className="h-10 w-10 object-cover rounded-md shrink-0 border border-zinc-100 dark:border-white/5" alt="" />
                                    )}
                                    <div className="space-y-0.5 leading-relaxed">
                                      <span className="text-gray-900 dark:text-white font-black block">{p.title}</span>
                                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">${(p.price || 0).toFixed(2)} USDT</p>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-3 justify-end">
                <button 
                  onClick={() => setEditingFeature(null)}
                  className="px-6 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  disabled={isSavingFeature}
                  onClick={handleSaveFeatureSettings}
                  className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1 shadow-lg"
                >
                  {isSavingFeature ? "Salvando..." : "Salvar Configurações"}
                </button>
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
