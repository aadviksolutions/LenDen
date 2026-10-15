import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { SubscriptionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const realBusinessFilter = { isDemo: false, id: { not: { startsWith: 'demo_' } } };

    const totalBusinesses = await prisma.business.count({ where: realBusinessFilter });
    const totalPlatformUsers = await prisma.user.count({ where: { isDemo: false } });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalMonthlyInvoicesProcessed = await prisma.invoice.count({
      where: {
        createdAt: { gte: startOfMonth },
        business: realBusinessFilter,
      },
    });

    const subscriptions = await prisma.subscription.findMany({
      where: {
        business: realBusinessFilter,
      },
      include: {
        business: {
          include: {
            memberships: {
              where: { role: 'BUSINESS_OWNER' },
              include: { user: true },
              take: 1,
            },
          },
        },
      },
    });

    const activeCount = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE).length;
    const trialCount = subscriptions.filter((s) => s.status === SubscriptionStatus.TRIALING).length;
    const suspendedCount = subscriptions.filter((s) => s.status === SubscriptionStatus.SUSPENDED).length;

    const mrr = subscriptions
      .filter((s) => s.status === SubscriptionStatus.ACTIVE)
      .reduce((sum, s) => sum + s.monthlyPrice, 0);

    // Get all real businesses with their active subscription & owner info
    const businesses = await prisma.business.findMany({
      where: realBusinessFilter,
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        memberships: {
          where: { role: 'BUSINESS_OWNER' },
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
          take: 1,
        },
        _count: {
          select: { invoices: true, customers: true, products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedBusinesses = businesses.map((b) => {
      const activeSub = b.subscriptions[0];
      const owner = b.memberships[0]?.user;
      return {
        id: b.id,
        businessName: b.name,
        legalName: b.legalName || b.name,
        tradeType: b.tradeType || 'General Retail',
        gstin: b.gstin || 'UNREGISTERED',
        state: b.state || 'Maharashtra',
        ownerName: owner?.name || 'Owner',
        ownerEmail: owner?.email || 'N/A',
        ownerPhone: owner?.phone || b.phone || 'N/A',
        plan: activeSub?.plan || 'FREE_TRIAL',
        subscriptionStatus: activeSub?.status || 'TRIALING',
        monthlyPrice: activeSub?.monthlyPrice || 0,
        trialDaysRemaining: activeSub?.trialDaysRemaining || 0,
        invoiceCount: b._count.invoices,
        customerCount: b._count.customers,
        itemCount: b._count.products,
        createdAt: b.createdAt,
      };
    });

    return NextResponse.json({
      metrics: {
        monthlyRecurringRevenue: `₹${mrr.toLocaleString('en-IN')}`,
        mrrNumeric: mrr,
        totalBusinesses,
        activeWorkspaces: activeCount,
        trialWorkspaces: trialCount,
        suspendedWorkspaces: suspendedCount,
        totalMonthlyInvoicesProcessed,
        totalPlatformUsers,
        platformUptime: '99.98%',
      },
      businesses: formattedBusinesses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch platform metrics' },
      { status: error.message?.includes('privileges') ? 403 : 500 }
    );
  }
}
