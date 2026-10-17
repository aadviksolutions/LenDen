import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const statusFilter = searchParams.get('status') || 'ALL'; // ALL, ACTIVE, SUSPENDED
    const roleFilter = searchParams.get('role') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isDemo: false,
    };

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (statusFilter === 'ACTIVE') {
      whereClause.isSuspended = false;
    } else if (statusFilter === 'SUSPENDED') {
      whereClause.isSuspended = true;
    }

    if (roleFilter !== 'ALL') {
      whereClause.platformRole = roleFilter;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            include: {
              business: {
                include: {
                  subscriptions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
          sessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              khataContacts: true,
              khataTransactions: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      const primaryMembership = u.memberships[0];
      const primaryBusiness = primaryMembership?.business;
      const latestSub = primaryBusiness?.subscriptions[0];
      const lastSession = u.sessions[0];

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        platformRole: u.platformRole,
        isSuspended: (u as any).isSuspended || false,
        suspendedReason: (u as any).suspendedReason || null,
        createdAt: u.createdAt,
        lastLogin: lastSession ? lastSession.createdAt : null,
        business: primaryBusiness
          ? {
              id: primaryBusiness.id,
              name: primaryBusiness.name,
              tradeType: primaryBusiness.tradeType,
              role: primaryMembership.role,
              plan: latestSub?.plan || 'FREE_KHATA',
              subscriptionStatus: latestSub?.status || 'ACTIVE',
            }
          : null,
        stats: {
          khataContacts: u._count.khataContacts,
          khataTransactions: u._count.khataTransactions,
        },
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
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
