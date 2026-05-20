
import { User, MonetizationTier } from '../types';

export const calculateMonetizationLevel = (user: User): MonetizationTier => {
  const followers = user.followers?.length || 0;
  if (followers > 100000) return MonetizationTier.LEVEL_4;
  if (followers > 10000) return MonetizationTier.LEVEL_3;
  if (followers > 1000) return MonetizationTier.LEVEL_2;
  return MonetizationTier.LEVEL_1;
};

export const checkMonetizationEligibility = (user: User): boolean => {
  const goals = user.monetizationGoals;
  if (!goals) return false;
  
  const meetsFollowers = (user.followers?.length || 0) >= (goals.followersGoal || 1000);
  const meetsWatchHours = (goals.currentWatchHours || 0) >= (goals.watchHoursGoal || 4000);
  const meetsIdentity = user.idVerificationStatus === 'APPROVED';
  
  return meetsFollowers && meetsWatchHours && meetsIdentity;
};

export const issueStrike = async (userId: string, reason: string, level: 'YELLOW' | 'RED' = 'YELLOW') => {
  console.log(`Issuing strike to user ${userId} for reason: ${reason}, level: ${level}`);
};

export const distributePremiumRevenue = async (userId: string, seconds: number) => {
  console.log(`Distributing premium revenue for user ${userId}: ${seconds} seconds`);
};

export const monetizationService = {
  calculateMonetizationLevel,
  checkMonetizationEligibility,
  issueStrike,
  distributePremiumRevenue
};
