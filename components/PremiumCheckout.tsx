
import React, { useState } from 'react';
import { User, UserSubscription } from '../types';
import { monetizationService } from '../services/monetizationService';
import { 
  CheckIcon, 
  SparklesIcon, 
  RocketLaunchIcon, 
  PlayIcon, 
  NoSymbolIcon,
  CloudArrowDownIcon,
  StarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

interface Props {
  user: User;
  onSuccess: () => void;
}

const PremiumCheckout: React.FC<Props> = ({ user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const planId = selectedPlan === 'MONTHLY' ? 'PREMIUM_MONTHLY' : 'PREMIUM_YEARLY';
      const success = await monetizationService.subscribeToPremium(user.id, planId);
      if (success) {
        onSuccess();
      } else {
        alert("Ocorreu um erro ao processar sua assinatura. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const plans = {
    MONTHLY: { price: 9.99, label: 'Mensal', period: 'mês' },
    YEARLY: { price: 89.90, label: 'Anual', period: 'ano', discount: '25% OFF' }
  };

  const benefits = [
    { icon: NoSymbolIcon, text: 'Sem anúncios em nenhum vídeo' },
    { icon: CloudArrowDownIcon, text: 'Downloads ilimitados para offline' },
    { icon: StarIcon, text: 'Insignia exclusiva de Membro Premium' },
    { icon: SparklesIcon, text: 'Acesso antecipado a novos recursos' },
    { icon: PlayIcon, text: 'Reprodução em segundo plano' },
    { icon: ShieldCheckIcon, text: 'Suporte prioritário 24/7' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-12">
        <div className="inline-flex p-3 bg-brand/10 text-brand rounded-3xl mb-4 animate-bounce">
          <SparklesIcon className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black dark:text-white mb-2">Cyberphone Premium</h1>
        <p className="text-gray-500 font-medium max-w-md mx-auto">
          A melhor experiência de entretenimento e educação, sem interrupções.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Benefits List */}
        <div className="space-y-6">
          {benefits.map((b, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 bg-white dark:bg-darkcard p-4 rounded-3xl border dark:border-white/10 shadow-sm"
            >
              <div className="p-2 bg-brand/10 text-brand rounded-xl">
                <b.icon className="h-5 w-5" />
              </div>
              <span className="font-bold dark:text-white text-sm">{b.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Pricing Card */}
        <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-2xl border-2 border-brand relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <div className="bg-brand text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">Recomendado</div>
          </div>

          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl mb-8">
            <button 
              onClick={() => setSelectedPlan('MONTHLY')}
              className={`flex-1 py-3 font-bold rounded-xl transition-all ${selectedPlan === 'MONTHLY' ? 'bg-white dark:bg-darkcard dark:text-white shadow-md' : 'text-gray-500'}`}
            >
              Mensal
            </button>
            <button 
              onClick={() => setSelectedPlan('YEARLY')}
              className={`flex-1 py-3 font-bold rounded-xl transition-all ${selectedPlan === 'YEARLY' ? 'bg-white dark:bg-darkcard dark:text-white shadow-md' : 'text-gray-500'}`}
            >
              Anual
            </button>
          </div>

          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black dark:text-white">${plans[selectedPlan].price}</span>
              <span className="text-gray-500 font-bold">/{plans[selectedPlan].period}</span>
            </div>
            {selectedPlan === 'YEARLY' && (
              <p className="text-brand text-xs font-black mt-2">Você economiza $30.00 por ano!</p>
            )}
          </div>

          <button 
            disabled={loading}
            onClick={handleSubscribe}
            className="w-full py-5 bg-brand text-white font-black rounded-3xl shadow-xl shadow-brand/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/50 border-t-white animate-spin rounded-full" />
            ) : (
              <>
                <RocketLaunchIcon className="h-5 w-5" />
                Começar agora
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 font-bold text-center mt-6 uppercase tracking-widest px-8">
            Cancele a qualquer momento. Pagamento seguro via Multicaixa / Stripe.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumCheckout;
