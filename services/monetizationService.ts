
import { 
  db, 
} from './firebaseClient';
import { 
  collection, doc, getDoc, getDocs, updateDoc, setDoc, query, where, orderBy, limit, increment
} from 'firebase/firestore';
import { 
  User, EarningRecord, SuperChat, AdCampaign, TransactionType, Transaction, MonetizationTier
} from '../types';
import { createTransaction, handleFirestoreError, OperationType, handleWalletTransaction } from './storageService';

const PLATFORM_AD_REV_SHARE = 0.45; // Plataforma fica com 45% da receita de anúncios
const PLATFORM_DONATION_SHARE = 0.30; // Plataforma fica com 30% de Super Chats e Presentes

export const monetizationService = {
  /**
   * Verifica a elegibilidade do criador para o Programa de Parcerias
   */
  async checkEligibility(user: User): Promise<{
    eligible: boolean;
    reason: string[];
    goals: any;
  }> {
    const goals = user.monetizationGoals || {
      followersGoal: 1000,
      watchHoursGoal: 4000,
      shortsViewsGoal: 10000000,
      currentFollowers: user.followers?.length || 0,
      currentWatchHours: 0,
      currentShortsViews: 0
    };

    const reasons: string[] = [];
    if (goals.currentFollowers < goals.followersGoal) {
      reasons.push(`Faltam ${goals.followersGoal - goals.currentFollowers} seguidores para a meta de ${goals.followersGoal}`);
    }
    
    const watchHoursMet = goals.currentWatchHours >= goals.watchHoursGoal;
    const shortsViewsMet = goals.currentShortsViews >= goals.shortsViewsGoal;

    if (!watchHoursMet && !shortsViewsMet) {
      reasons.push(`Necessário atingir ${goals.watchHoursGoal}h de exibição ou ${goals.shortsViewsGoal} views em Reels`);
    }

    if (user.idVerificationStatus !== 'APPROVED') {
      reasons.push('É necessário ter a identidade verificada para monetizar');
    }

    return {
      eligible: reasons.length === 0,
      reason: reasons,
      goals
    };
  },

  /**
   * Sistema de Leilão Inteligente de Anúncios
   */
  async serveIntelligentAd(userInterests: string[] = []): Promise<AdCampaign | null> {
    if (!db) return null;
    try {
      const adsRef = collection(db, 'ads');
      const q = query(adsRef, where('isActive', '==', true), orderBy('bidAmount', 'desc'), limit(15));
      const snap = await getDocs(q);
      const ads = snap.docs.map(d => ({ ...d.data(), id: d.id } as AdCampaign));
      
      if (ads.length === 0) return null;
      
      // Se houver interesses, filtra por categorias correspondentes
      if (userInterests.length > 0) {
        const targeted = ads.filter(ad => 
          ad.categories?.some(cat => userInterests.includes(cat))
        );
        if (targeted.length > 0) return targeted[Math.floor(Math.random() * targeted.length)];
      }
      
      // Caso contrário, retorna um dos top 5 maiores lances aleatoriamente para diversificar
      const topAds = ads.slice(0, 5);
      return topAds[Math.floor(Math.random() * topAds.length)];
    } catch (err) {
      console.error("[MONETIZATION] Ad Serving Error:", err);
      return null;
    }
  },

  /**
   * Registra uma visualização com impacto financeiro (Impressão)
   */
  async recordAdImpression(postId: string, creatorId: string, adId: string) {
    if (!db) return;
    try {
      const adRef = doc(db, 'ads', adId);
      const adDoc = await getDoc(adRef);
      if (!adDoc.exists()) return;
      
      const adData = adDoc.data() as AdCampaign;
      const cpm = adData.bidAmount || 2.00; // Default $2.00 CPM
      const creatorEarnings = (cpm / 1000) * (1 - PLATFORM_AD_REV_SHARE);

      // 1. Atualiza métricas do anúncio
      await updateDoc(adRef, {
        "performance.impressions": increment(1),
        "performance.spend": increment(cpm / 1000)
      });

      // 2. Atualiza ganhos do criador
      await this.updateCreatorEarnings(creatorId, creatorEarnings, 'AD');
    } catch (err) {
      console.error("[MONETIZATION] Error recording impression:", err);
    }
  },

  /**
   * Processa uma doação via Super Chat
   */
  async processSuperChat(superChat: Partial<SuperChat>, creatorId: string) {
    if (!db) return;
    try {
      const platformFee = superChat.amount! * PLATFORM_DONATION_SHARE;
      const creatorShare = superChat.amount! - platformFee;
      
      // 1. Salva o registro do Super Chat
      const scRef = doc(collection(db, 'super_chats'));
      const fullSC = { ...superChat, id: scRef.id, timestamp: Date.now() } as SuperChat;
      await setDoc(scRef, fullSC);

      // 2. Debita do usuário
      await createTransaction({
        userId: superChat.userId!,
        type: TransactionType.DONATION,
        amount: -superChat.amount!,
        description: `Super Chat enviado no vídeo/live`,
        status: 'COMPLETED',
        timestamp: Date.now(),
        id: `sc_out_${Date.now()}`
      } as any);

      // 3. Atualiza ganhos e balance do criador
      await this.updateCreatorEarnings(creatorId, creatorShare, 'DONATION');
      
      await createTransaction({
        userId: creatorId,
        type: TransactionType.DONATION,
        amount: creatorShare,
        description: `Recebimento de Super Chat`,
        status: 'COMPLETED',
        timestamp: Date.now(),
        id: `sc_in_${Date.now()}`
      } as any);

      return fullSC;
    } catch (err) {
      console.error("[MONETIZATION] Super Chat Error:", err);
      throw err;
    }
  },

  /**
   * Calcula e atualiza o nível do criador com base nos ganhos totais
   */
  async updateCreatorTier(userId: string, totalEarnings: number) {
    if (!db) return;
    let newTier: MonetizationTier = MonetizationTier.LEVEL_1;
    
    if (totalEarnings >= 2000) newTier = MonetizationTier.LEVEL_4;
    else if (totalEarnings >= 500) newTier = MonetizationTier.LEVEL_3;
    else if (totalEarnings >= 100) newTier = MonetizationTier.LEVEL_2;
    
    try {
      await updateDoc(doc(db, 'profiles', userId), { monetizationTier: newTier });
      await updateDoc(doc(db, 'public_profiles', userId), { monetizationTier: newTier });
    } catch (err) {
      console.error("[MONETIZATION] Error updating tier:", err);
    }
  },

  /**
   * Atualiza a contabilidade do criador (Diária e Vitalícia)
   */
  async updateCreatorEarnings(creatorId: string, amount: number, source: 'AD' | 'DONATION' | 'SUBSCRIPTION' | 'AFFILIATE') {
    if (!db) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const recordId = `${creatorId}_${dateStr}`;
    const recordRef = doc(db, 'earnings', recordId);

    try {
      const recordSnap = await getDoc(recordRef);
      if (recordSnap.exists()) {
        await updateDoc(recordRef, {
          adRevenue: increment(source === 'AD' ? amount : 0),
          donationsRevenue: increment(source === 'DONATION' ? amount : 0),
          subscriptionsRevenue: increment(source === 'SUBSCRIPTION' ? amount : 0),
          totalDaily: increment(amount)
        });
      } else {
        await setDoc(recordRef, {
          id: recordId,
          creatorId,
          date: dateStr,
          adRevenue: source === 'AD' ? amount : 0,
          donationsRevenue: source === 'DONATION' ? amount : 0,
          subscriptionsRevenue: source === 'SUBSCRIPTION' ? amount : 0,
          totalDaily: amount,
          viewsCount: 1
        });
      }

      // Atualiza saldo e estatísticas vitalícias no perfil
      const profileRef = doc(db, 'profiles', creatorId);
      const publicRef = doc(db, 'public_profiles', creatorId);
      
      const updateData = {
        "creatorStats.estimatedEarnings": increment(amount),
        "totalEarnings": increment(amount),
        "balance": increment(amount)
      };

      await updateDoc(profileRef, updateData);
      await updateDoc(publicRef, { "balance": increment(amount) });

      // Verifica se o nível subiu
      const profile = await getDoc(profileRef);
      if (profile.exists()) {
        const pData = profile.data();
        await this.updateCreatorTier(creatorId, pData.balance || 0);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'earnings/' + recordId);
    }
  },

  /**
   * Ativa assinatura premium para o usuário
   */
  async subscribeToPremium(userId: string, planId: 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY'): Promise<boolean> {
    if (!db) return false;
    try {
      const expiry = Date.now() + (planId === 'PREMIUM_MONTHLY' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000);
      
      const profileRef = doc(db, 'profiles', userId);
      const publicRef = doc(db, 'public_profiles', userId);
      
      await updateDoc(profileRef, {
        isPremium: true,
        premiumExpiry: expiry
      });
      
      await updateDoc(publicRef, {
        isPremium: true,
        premiumExpiry: expiry
      });

      // Salva registro da assinatura
      const subRef = doc(collection(db, 'subscriptions'));
      await setDoc(subRef, {
        id: subRef.id,
        userId,
        planId,
        status: 'ACTIVE',
        startDate: Date.now(),
        expiryDate: expiry,
        autoRenew: true
      });

      return true;
    } catch (err) {
      console.error("[MONETIZATION] Premium Subscription Error:", err);
      return false;
    }
  },

  /**
   * Distribui receita Premium baseada em visualização
   * No modelo real, isso seria calculado em lote, aqui fazemos por visualização para efeito demonstrativo
   */
  async distributePremiumRevenue(creatorId: string, watchSeconds: number) {
    if (!db) return;
    // Estimativa: $0.01 por cada 10 minutos assistidos de usuários Premium
    const ratePerSecond = 0.01 / 600; 
    const share = watchSeconds * ratePerSecond;
    
    if (share > 0) {
      await this.updateCreatorEarnings(creatorId, share, 'SUBSCRIPTION');
    }
  },

  /**
   * Aplica um Strike de direitos autorais ou violação de política
   */
  async issueStrike(userId: string, reason: string, severity: 'YELLOW' | 'RED') {
    if (!db) return;
    try {
      const profileRef = doc(db, 'profiles', userId);
      const publicRef = doc(db, 'public_profiles', userId);
      
      const updateData: any = {
        "creatorStats.strikes": increment(1)
      };

      if (severity === 'RED') {
        updateData.monetizationStatus = 'SUSPENDED';
        updateData.isMonetized = false;
      }

      await updateDoc(profileRef, updateData);
      await updateDoc(publicRef, { 
        monetizationStatus: updateData.monetizationStatus || 'APPROVED'
      });

      return true;
    } catch (err) {
      console.error("[MONETIZATION] Error issuing strike:", err);
      return false;
    }
  },

  /**
   * Processa a visualização de um anúncio e debita do orçamento
   */
  async handleAdView(adId: string, cost: number = 0.01) {
    if (!db) return;
    try {
      const adRef = doc(db, 'ads', adId);
      await updateDoc(adRef, {
        budget: increment(-cost),
        reachedUsersCount: increment(1)
      });
      
      // Se o orçamento acabar, desativa
      const adSnap = await getDoc(adRef);
      if (adSnap.exists() && adSnap.data().budget <= 0) {
        await updateDoc(adRef, { isActive: false });
      }
    } catch (err) {
      console.error("[MONETIZATION] Error handling ad view:", err);
    }
  },

  /**
   * Busca histórico de ganhos para o Dashboard
   */
  async getEarningsHistory(creatorId: string, days: number = 30): Promise<EarningRecord[]> {
    if (!db) return [];
    try {
      const q = query(
        collection(db, 'earnings'),
        where('creatorId', '==', creatorId),
        orderBy('date', 'desc'),
        limit(days)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as EarningRecord).reverse();
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'earnings');
      return [];
    }
  }
};
