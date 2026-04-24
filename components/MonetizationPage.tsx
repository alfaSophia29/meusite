import React, { useState } from 'react';
import { User, PostType } from '../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseClient';
import { 
  CheckCircleIcon, 
  LockClosedIcon, 
  UserGroupIcon, 
  PlayIcon, 
  IdentificationIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { getAoaExchangeRate } from '../services/currencyService';

interface MonetizationPageProps {
  currentUser: User;
  onNavigate: (page: any) => void;
  refreshUser: () => Promise<void>;
}

const MonetizationPage: React.FC<MonetizationPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [isApplying, setIsApplying] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(930);

  React.useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);

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

  const currentFollowers = currentUser.followers?.length || 0;
  const watchHours = goals.currentWatchHours || 0;
  const shortsViews = goals.currentShortsViews || 0;
  
  const meetsFollowers = currentFollowers >= goals.followersGoal;
  const meetsWatchHours = watchHours >= goals.watchHoursGoal;
  const meetsShorts = shortsViews >= goals.shortsViewsGoal;
  const meetsActivity = meetsWatchHours || meetsShorts;
  const meetsIdentity = currentUser.idVerificationStatus === 'APPROVED';

  const isEligible = meetsFollowers && meetsActivity && meetsIdentity;

  const handleApply = async () => {
    if (!db || !isEligible || !acceptedTerms) return;
    setIsApplying(true);
    try {
      await updateDoc(doc(db, 'profiles', currentUser.id), {
        monetizationStatus: 'PENDING',
        'monetizationGoals.termsAccepted': true
      });
      await updateDoc(doc(db, 'public_profiles', currentUser.id), {
        monetizationStatus: 'PENDING'
      });
      await refreshUser();
    } catch (err) {
      console.error("Erro ao solicitar monetização:", err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleAdminApprove = async () => {
    if (!db || !currentUser.isAdmin) return;
    try {
      await updateDoc(doc(db, 'profiles', currentUser.id), {
        monetizationStatus: 'APPROVED',
        isMonetized: true
      });
      await updateDoc(doc(db, 'public_profiles', currentUser.id), {
        monetizationStatus: 'APPROVED'
      });
      await refreshUser();
    } catch (err) {
      console.error("Admin approval error:", err);
    }
  };

  const renderStatus = () => {
    switch (currentUser.monetizationStatus) {
      case 'APPROVED':
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <SparklesIcon className="h-40 w-40 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30">
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white/80 font-black uppercase text-[10px] tracking-widest">Parceiro Oficial CyBerPhone</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2">Canal Monetizado</h2>
                <p className="text-white/80 text-sm font-medium max-w-md">Você está gerando receita com anúncios, assinaturas e apoio de fãs. Continue criando!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Receita Estimada (Mês)</span>
                <p className="text-3xl font-black text-gray-900 dark:text-white">$1,245.80</p>
                <p className="text-[10px] font-bold text-green-600 mt-1 uppercase">≈ {(1245.80 * exchangeRate).toLocaleString()} KZ</p>
                <div className="mt-4 flex items-center gap-2 text-green-500 text-[10px] font-bold">
                  <ArrowRightIcon className="h-3 w-3 -rotate-45" /> +12.5% em relação ao mês anterior
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">RPM (Receita por mil)</span>
                <p className="text-3xl font-black text-gray-900 dark:text-white">$4.20</p>
                <div className="mt-4 flex items-center gap-2 text-blue-500 text-[10px] font-bold">
                  Média do nicho: $3.50
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Anúncios Exibidos</span>
                <p className="text-3xl font-black text-gray-900 dark:text-white">284,500</p>
                <div className="mt-4 flex items-center gap-2 text-purple-500 text-[10px] font-bold">
                  98% de retenção de ad
                </div>
              </div>
            </div>
          </div>
        );
      case 'PENDING':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-6 rounded-3xl mb-8 flex items-center gap-4 animate-pulse">
            <SparklesIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-black text-blue-900 dark:text-blue-100 uppercase tracking-tighter">Análise em Andamento</h2>
              <p className="text-blue-700 dark:text-blue-300 text-sm">Sua solicitação está sendo revisada por nossa equipe de moderação. Isso pode levar até 48 horas.</p>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-6 rounded-3xl mb-8 flex items-center gap-4">
            <LockClosedIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
            <div>
              <h2 className="text-xl font-black text-red-900 dark:text-red-100 uppercase tracking-tighter">Solicitação Recusada</h2>
              <p className="text-red-700 dark:text-red-300 text-sm">Lamentamos, mas seu canal não atende às nossas diretrizes atuais. Você pode tentar novamente em 30 dias.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {currentUser.isAdmin && currentUser.monetizationStatus !== 'APPROVED' && (
        <div className="mb-4 flex justify-end">
          <button 
            onClick={handleAdminApprove}
            className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-200 transition-colors"
          >
            [Admin] Aprovar Instantaneamente
          </button>
        </div>
      )}
      {/* Header Estilo YouTube */}
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">
          Cresça com o <span className="text-blue-600">CyBerPhone</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl font-medium">
          Como parceiro do CyBerPhone, você pode gerar receita com seu conteúdo, receber apoio dos fãs e usar ferramentas de direitos autorais exclusivas.
        </p>
      </div>

      {renderStatus()}

      {/* Grid de Benefícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white dark:bg-[#1a1c23] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-blue-500/30 transition-all duration-500">
           <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-800">
             <PlayIcon className="h-8 w-8 text-blue-600" />
           </div>
           <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Receita de Anúncios</h3>
           <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Ganhe uma parte da receita gerada por anúncios exibidos em seus vídeos e Reels.</p>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-purple-500/30 transition-all duration-500">
           <div className="h-14 w-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-100 dark:border-purple-800">
             <SparklesIcon className="h-8 w-8 text-purple-600" />
           </div>
           <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Clube de Membros</h3>
           <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Crie níveis de assinatura mensal e ofereça benefícios exclusivos para seus maiores fãs.</p>
        </div>
      </div>

      {/* Seção de Requisitos (A "Escada") */}
      <div className="bg-white dark:bg-[#1a1c23] p-8 md:p-12 rounded-[40px] border border-gray-100 dark:border-gray-800 mb-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Como aderir</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Cumpra os seguintes marcos para se tornar elegível para análise.</p>
            </div>
            {isEligible && currentUser.monetizationStatus === 'INELIGIBLE' && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-bounce">
                Elegível para Solicitar
              </span>
            )}
          </div>

          <div className="space-y-12">
            {/* Seguidores */}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${meetsFollowers ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    <UserGroupIcon className="h-6 w-6" />
                  </div>
                  <span className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">{goals.followersGoal.toLocaleString()} Seguidores</span>
                </div>
                {meetsFollowers && <CheckCircleSolid className="h-6 w-6 text-green-500" />}
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${Math.min((currentFollowers / goals.followersGoal) * 100, 100)}%` }}
                  className={`h-full ${meetsFollowers ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'} rounded-full transition-all duration-1000`}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs font-bold text-gray-400">{currentFollowers.toLocaleString()} atuais</span>
                <span className="text-xs font-bold text-gray-400">Objetivo: {goals.followersGoal.toLocaleString()}</span>
              </div>
            </div>

            {/* Atividade (Horas ou Shorts) */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">E um destes</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Horas de Exibição */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${meetsWatchHours ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <PlayIcon className="h-6 w-6" />
                      </div>
                      <span className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">4.000 Horas</span>
                    </div>
                    {meetsWatchHours && <CheckCircleSolid className="h-6 w-6 text-green-500" />}
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${Math.min((watchHours / goals.watchHoursGoal) * 100, 100)}%` }}
                      className={`h-full ${meetsWatchHours ? 'bg-green-500' : 'bg-blue-600'} rounded-full transition-all duration-1000`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">De vídeos públicos (365 dias)</p>
                </div>

                {/* Visualizações Shorts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${meetsShorts ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <SparklesIcon className="h-6 w-6" />
                      </div>
                      <span className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">10 Milhões</span>
                    </div>
                    {meetsShorts && <CheckCircleSolid className="h-6 w-6 text-green-500" />}
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${Math.min((shortsViews / goals.shortsViewsGoal) * 100, 100)}%` }}
                      className={`h-full ${meetsShorts ? 'bg-green-500' : 'bg-blue-600'} rounded-full transition-all duration-1000`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">De Reels públicos (90 dias)</p>
                </div>
              </div>
            </div>

            {/* Identificação e Segurança */}
            <div className="pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="flex items-start gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50">
                  <div className={`p-3 rounded-2xl ${meetsIdentity ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
                    <IdentificationIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="font-black text-gray-900 dark:text-white uppercase text-xs mb-1">Verificação de ID</h5>
                    <p className="text-[10px] text-gray-500 font-medium">Sua identidade deve estar aprovada.</p>
                    {!meetsIdentity && (
                      <button onClick={() => onNavigate('settings')} className="mt-2 text-blue-600 text-[10px] font-black uppercase flex items-center gap-1">
                        Verificar Agora <ArrowRightIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
               </div>

               <div className="flex items-start gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600">
                    <ShieldCheckIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="font-black text-gray-900 dark:text-white uppercase text-xs mb-1">Diretrizes da Comunidade</h5>
                    <p className="text-[10px] text-gray-500 font-medium">Sua conta deve estar livre de avisos ativos.</p>
                    <span className="mt-2 inline-block text-green-600 text-[10px] font-black uppercase">Livre de Avisos</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Aplicação Style YouTube Studio */}
      {currentUser.monetizationStatus === 'INELIGIBLE' && (
        <div className="bg-white dark:bg-[#1a1c23] p-10 rounded-[40px] border border-gray-100 dark:border-gray-800 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Pronto para começar?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 max-w-lg mx-auto leading-relaxed">
            Assim que você atingir os requisitos acima, poderá enviar sua conta para análise. Certifique-se de ter lido e aceitado nossos termos de uso para criadores.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
              />
              <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 transition-colors">
                Eu aceito os Termos de Parceiro do CyBerPhone
              </span>
            </label>

            <button
              disabled={!isEligible || !acceptedTerms || isApplying}
              onClick={handleApply}
              className={`
                w-full max-w-xs py-5 rounded-3xl font-black uppercase text-sm tracking-widest transition-all
                ${isEligible && acceptedTerms && !isApplying
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:scale-105 hover:bg-blue-700 active:scale-95'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}
              `}
            >
              {isApplying ? 'Solicitando...' : isEligible ? 'Solicitar Agora' : 'Ainda não elegível'}
            </button>
            
            {!isEligible && (
              <p className="text-amber-500 text-[10px] font-black uppercase tracking-tighter">
                Continue produzindo conteúdo de qualidade para atingir as metas!
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-20 text-center pb-20">
         <p className="text-gray-400 dark:text-gray-600 text-[10px] font-medium uppercase tracking-[0.2em]">
           © 2026 CyBerPhone Partner Program • Central de Ajuda • Feedback
         </p>
      </div>
    </div>
  );
};

export default MonetizationPage;
