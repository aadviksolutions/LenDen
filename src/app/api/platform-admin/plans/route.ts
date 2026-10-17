import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { OFFICIAL_PLANS } from '@/lib/subscription/plans';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function GET() {
  try {
    await requireSuperAdmin();

    // Count subscribers per plan in PostgreSQL
    const planCounts = await prisma.subscription.groupBy({
      by: ['plan'],
      where: {
        status: SubscriptionStatus.ACTIVE,
        business: { isDemo: false },
      },
      _count: { id: true },
    });

    const countsMap: Record<string, number> = {};
    planCounts.forEach((c) => {
      countsMap[c.plan] = c._count.id;
    });

    const enrichedPlans = Object.entries(OFFICIAL_PLANS).map(([key, config]) => {
      let dbEnumKey = key;
      if (key === 'GROWTH') dbEnumKey = 'GROWTH_PRO';
      if (key === 'SCALE') dbEnumKey = 'ENTERPRISE';

      const monthlyPrice = config.pricing.MONTHLY.totalPrice;
      const annualPrice = config.pricing.YEARLY.totalPrice;
      const priceLabel = monthlyPrice === 0 ? '₹0' : `₹${monthlyPrice}/mo`;

      return {
        key,
        dbEnumKey,
        name: config.name,
        priceLabel,
        monthlyPrice,
        annualPrice,
        badge: config.badge || (key === 'FREE_KHATA' ? 'Free Forever' : 'Paid Tier'),
        features: config.features,
        quotas: {
          maxMonthlyInvoices: config.limits.maxMonthlyInvoices,
          maxStaffSeats: config.limits.maxUsers,
          maxBranches: config.limits.maxLocations,
          whatsAppQuota: 100,
        },
        activeSubscribersCount: countsMap[dbEnumKey] || countsMap[key] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      plans: enrichedPlans,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
