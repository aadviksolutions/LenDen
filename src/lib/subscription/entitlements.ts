import prisma from '@/lib/prisma';
import { OFFICIAL_PLANS, normalizePlanKey, PlanKey, OfficialPlan } from './plans';

export interface BusinessEntitlementsResult {
  businessId: string;
  businessName: string;
  isDemo: boolean;
  planKey: PlanKey;
  planName: string;
  limits: OfficialPlan['limits'];
  entitlements: OfficialPlan['entitlements'];
  features: string[];
}

export async function getBusinessEntitlements(
  businessId: string
): Promise<BusinessEntitlementsResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!business) {
    // Default fallback to Starter
    const defaultPlan = OFFICIAL_PLANS.STARTER;
    return {
      businessId,
      businessName: 'Unknown Workspace',
      isDemo: false,
      planKey: 'STARTER',
      planName: defaultPlan.name,
      limits: defaultPlan.limits,
      entitlements: defaultPlan.entitlements,
      features: defaultPlan.features,
    };
  }

  const isDemo = Boolean(business.isDemo || business.id.startsWith('demo_'));
  const activeSub = business.subscriptions[0];
  const planKey = normalizePlanKey(activeSub?.plan);
  const planConfig = OFFICIAL_PLANS[planKey];

  return {
    businessId: business.id,
    businessName: business.name,
    isDemo,
    planKey,
    planName: planConfig.name,
    limits: planConfig.limits,
    entitlements: planConfig.entitlements,
    features: planConfig.features,
  };
}

export async function checkFeatureEntitlement(
  businessId: string,
  feature: keyof OfficialPlan['entitlements']
): Promise<{
  allowed: boolean;
  requiredPlan?: 'STARTER' | 'GROWTH' | 'SCALE';
  planName?: string;
  message?: string;
}> {
  const result = await getBusinessEntitlements(businessId);
  const allowed = Boolean(result.entitlements[feature]);

  if (allowed) {
    return { allowed: true };
  }

  // Determine required plan
  const requiredPlan: 'STARTER' | 'GROWTH' | 'SCALE' = OFFICIAL_PLANS.STARTER.entitlements[feature]
    ? 'STARTER'
    : OFFICIAL_PLANS.GROWTH.entitlements[feature]
    ? 'GROWTH'
    : 'SCALE';

  const requiredPlanConfig = OFFICIAL_PLANS[requiredPlan];

  return {
    allowed: false,
    requiredPlan,
    planName: requiredPlanConfig.name,
    message: `This feature is available on ${requiredPlanConfig.name} (starting from ₹${requiredPlanConfig.pricing.MONTHLY.totalPrice}/mo).`,
  };
}
