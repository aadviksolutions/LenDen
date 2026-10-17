import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';

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
      isDemo: false,
      id: { not: { startsWith: 'demo_' } },
    };

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { legalName: { contains: query, mode: 'insensitive' } },
        { gstin: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (planFilter !== 'ALL') {
      whereClause.subscriptions = {
        some: { plan: planFilter },
      };
    }

    if (statusFilter !== 'ALL') {
      whereClause.subscriptions = {
        some: { status: statusFilter },
      };
    }

    const [total, businesses] = await Promise.all([
      prisma.business.count({ where: whereClause }),
      prisma.business.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          memberships: {
            where: { role: 'BUSINESS_OWNER' },
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              invoices: true,
              customers: true,
              products: true,
              khataContacts: true,
              khataTransactions: true,
            },
          },
        },
      }),
    ]);

    const formatted = businesses.map((b) => {
      const activeSub = b.subscriptions[0];
      const owner = b.memberships[0]?.user;

      return {
        id: b.id,
        businessName: b.name,
        legalName: b.legalName || b.name,
        tradeType: b.tradeType || 'Retail',
        gstin: b.gstin || 'UNREGISTERED',
        state: b.state || 'Maharashtra',
        ownerName: owner?.name || 'Owner',
        ownerEmail: owner?.email || 'N/A',
        ownerPhone: owner?.phone || b.phone || 'N/A',
        plan: activeSub?.plan || 'FREE_KHATA',
        subscriptionStatus: activeSub?.status || 'ACTIVE',
        monthlyPrice: activeSub?.monthlyPrice || 0,
        trialDaysRemaining: activeSub?.trialDaysRemaining || 0,
        endDate: activeSub?.endDate || null,
        invoiceCount: b._count.invoices,
        customerCount: b._count.customers,
        itemCount: b._count.products,
        khataContactsCount: b._count.khataContacts,
        khataTransactionsCount: b._count.khataTransactions,
        createdAt: b.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      businesses: formatted,
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
