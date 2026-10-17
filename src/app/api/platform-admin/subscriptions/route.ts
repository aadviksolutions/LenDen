import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const planFilter = searchParams.get('plan') || 'ALL';
    const statusFilter = searchParams.get('status') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      business: {
        isDemo: false,
        id: { not: { startsWith: 'demo_' } },
      },
    };

    if (query) {
      whereClause.business.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (planFilter !== 'ALL') {
      whereClause.plan = planFilter as SubscriptionPlan;
    }

    if (statusFilter !== 'ALL') {
      whereClause.status = statusFilter as SubscriptionStatus;
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where: whereClause }),
      prisma.subscription.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            include: {
              memberships: {
                where: { role: 'BUSINESS_OWNER' },
                include: {
                  user: {
                    select: { id: true, name: true, email: true, phone: true },
                  },
                },
                take: 1,
              },
            },
          },
          subscriptionPayments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const formatted = subscriptions.map((s) => {
      const owner = s.business.memberships[0]?.user;
      return {
        id: s.id,
        businessId: s.businessId,
        businessName: s.business.name,
        tradeType: s.business.tradeType,
        ownerName: owner?.name || 'Owner',
        ownerEmail: owner?.email || 'N/A',
        ownerPhone: owner?.phone || 'N/A',
        plan: s.plan,
        status: s.status,
        monthlyPrice: s.monthlyPrice,
        startDate: s.startDate,
        endDate: s.endDate,
        trialDaysRemaining: s.trialDaysRemaining,
        maxMonthlyInvoices: s.maxMonthlyInvoices,
        maxStaffSeats: s.maxStaffSeats,
        maxBranches: s.maxBranches,
        createdAt: s.createdAt,
        payments: s.subscriptionPayments,
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
