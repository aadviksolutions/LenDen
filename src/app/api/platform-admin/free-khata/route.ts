import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Free Khata condition: Subscription plan is FREE_KHATA or tradeType contains Free Khata
    const freeKhataBizFilter: any = {
      isDemo: false,
      OR: [
        { subscriptions: { some: { plan: SubscriptionPlan.FREE_KHATA } } },
        { tradeType: 'Personal Free Khata' },
      ],
    };

    if (query) {
      freeKhataBizFilter.AND = [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (statusFilter !== 'ALL') {
      freeKhataBizFilter.subscriptions = {
        some: {
          plan: SubscriptionPlan.FREE_KHATA,
          status: statusFilter,
        },
      };
    }

    const [
      totalFreeKhata,
      newLast7Days,
      newLast30Days,
      activeCount,
      suspendedCount,
      totalContacts,
      totalTransactions,
      totalRepayments,
      businesses,
    ] = await Promise.all([
      prisma.subscription.count({
        where: { plan: SubscriptionPlan.FREE_KHATA, business: { isDemo: false } },
      }),
      prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.FREE_KHATA,
          createdAt: { gte: sevenDaysAgo },
          business: { isDemo: false },
        },
      }),
      prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.FREE_KHATA,
          createdAt: { gte: thirtyDaysAgo },
          business: { isDemo: false },
        },
      }),
      prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.FREE_KHATA,
          status: SubscriptionStatus.ACTIVE,
          business: { isDemo: false },
        },
      }),
      prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.FREE_KHATA,
          status: SubscriptionStatus.SUSPENDED,
          business: { isDemo: false },
        },
      }),
      prisma.khataContact.count(),
      prisma.khataTransaction.count(),
      prisma.khataRepayment.count(),
      prisma.business.findMany({
        where: freeKhataBizFilter,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            where: { plan: SubscriptionPlan.FREE_KHATA },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          memberships: {
            where: { role: 'BUSINESS_OWNER' },
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true, isSuspended: true },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              khataContacts: true,
              khataTransactions: true,
              khataRepayments: true,
            },
          },
        },
      }),
    ]);

    const formattedAccounts = businesses.map((b) => {
      const sub = b.subscriptions[0];
      const owner = b.memberships[0]?.user;

      return {
        id: b.id,
        businessName: b.name,
        ownerId: owner?.id || null,
        ownerName: owner?.name || 'User',
        ownerEmail: owner?.email || b.email || 'N/A',
        ownerPhone: owner?.phone || b.phone || 'N/A',
        status: sub?.status || SubscriptionStatus.ACTIVE,
        isUserSuspended: (owner as any)?.isSuspended || false,
        contactsCount: b._count.khataContacts,
        transactionsCount: b._count.khataTransactions,
        repaymentsCount: b._count.khataRepayments,
        createdAt: b.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalFreeKhata,
        newLast7Days,
        newLast30Days,
        activeCount,
        suspendedCount,
        totalContacts,
        totalTransactions,
        totalRepayments,
      },
      accounts: formattedAccounts,
      pagination: {
        page,
        limit,
        total: totalFreeKhata,
        totalPages: Math.ceil(totalFreeKhata / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
