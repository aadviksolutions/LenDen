'use client';

import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_PLANS, normalizePlanKey, PlanKey, OfficialPlan } from '@/lib/subscription/plans';

export interface UseEntitlementsResult {
  planKey: PlanKey;
  planName: string;
  isFreeKhata: boolean;
  isStarter: boolean;
  isGrowth: boolean;
  isScale: boolean;
  isSuperAdmin: boolean;
  limits: OfficialPlan['limits'];
  entitlements: OfficialPlan['entitlements'];
  isAllowed: (feature: keyof OfficialPlan['entitlements']) => boolean;
  canAccessCommercial: boolean;
}

export function useEntitlements(): UseEntitlementsResult {
  const { user, activeBusiness, loading } = useAuth();

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';

  // If loading or no active business subscription, default to FREE_KHATA (safest fallback)
  const rawPlan = activeBusiness?.subscription?.plan;
  const planKey: PlanKey = normalizePlanKey(rawPlan);
  const planConfig = OFFICIAL_PLANS[planKey];

  const isFreeKhata = planKey === 'FREE_KHATA';
  const isStarter = planKey === 'STARTER';
  const isGrowth = planKey === 'GROWTH';
  const isScale = planKey === 'SCALE';

  const isAllowed = (feature: keyof OfficialPlan['entitlements']): boolean => {
    if (isSuperAdmin) return true;
    if (loading) return false;
    return Boolean(planConfig.entitlements[feature]);
  };

  const canAccessCommercial = isSuperAdmin || !isFreeKhata;

  return {
    planKey,
    planName: planConfig.name,
    isFreeKhata,
    isStarter,
    isGrowth,
    isScale,
    isSuperAdmin,
    limits: planConfig.limits,
    entitlements: planConfig.entitlements,
    isAllowed,
    canAccessCommercial,
  };
}
