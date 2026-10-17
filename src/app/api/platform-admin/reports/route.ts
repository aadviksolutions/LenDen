import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d'; // today, 7d, 30d, this_month, last_month, custom
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (range === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 1. Subscription Payments in date range
    const periodPayments = await (prisma as any).subscriptionPayment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        business: { select: { id: true, name: true } },
      },
    });

    const grossCollections = periodPayments
      .filter((p: any) => p.status === 'SUCCESS')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const refundsTotal = periodPayments
      .filter((p: any) => p.status === 'REFUNDED' || (p.refundAmount && p.refundAmount > 0))
      .reduce((sum: number, p: any) => sum + (p.refundAmount || p.amount || 0), 0);

    const netCollections = Math.max(0, grossCollections - refundsTotal);

    // Revenue by plan
    const revenueByPlan: Record<string, number> = {
      STARTER: 0,
      GROWTH_PRO: 0,
      ENTERPRISE: 0,
    };

    periodPayments
      .filter((p: any) => p.status === 'SUCCESS')
      .forEach((p: any) => {
        const planKey = p.plan || 'STARTER';
        revenueByPlan[planKey] = (revenueByPlan[planKey] || 0) + (p.amount || 0);
      });

    // Revenue by gateway
    const revenueByGateway: Record<string, number> = {};
    periodPayments
      .filter((p: any) => p.status === 'SUCCESS')
      .forEach((p: any) => {
        const gw = p.gateway || 'OTHER';
        revenueByGateway[gw] = (revenueByGateway[gw] || 0) + (p.amount || 0);
      });

    // 2. Active MRR snapshot
    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        plan: { not: SubscriptionPlan.FREE_KHATA },
        business: { isDemo: false },
      },
    });
    const currentMRR = activeSubs.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);

    // 3. User & Business Registrations in date range
    const [newUsersCount, newBusinessesCount, newFreeKhataCount] = await Promise.all([
      prisma.user.count({
        where: { isDemo: false, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.business.count({
        where: { isDemo: false, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.FREE_KHATA,
          createdAt: { gte: startDate, lte: endDate },
          business: { isDemo: false },
        },
      }),
    ]);

    // 4. Overall Plan Distribution (Current State)
    const allSubs = await prisma.subscription.findMany({
      where: { business: { isDemo: false } },
      select: { plan: true, status: true },
    });

    const planDistribution: Record<string, number> = {
      FREE_KHATA: 0,
      STARTER: 0,
      GROWTH_PRO: 0,
      ENTERPRISE: 0,
      FREE_TRIAL: 0,
    };

    allSubs.forEach((s) => {
      planDistribution[s.plan] = (planDistribution[s.plan] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      period: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      financials: {
        grossCollections,
        refundsTotal,
        netCollections,
        currentMRR,
        revenueByPlan,
        revenueByGateway,
        successfulPaymentsCount: periodPayments.filter((p: any) => p.status === 'SUCCESS').length,
        pendingPaymentsCount: periodPayments.filter((p: any) => p.status === 'PENDING').length,
        failedPaymentsCount: periodPayments.filter((p: any) => p.status === 'FAILED').length,
      },
      growth: {
        newUsersCount,
        newBusinessesCount,
        newFreeKhataCount,
        planDistribution,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
