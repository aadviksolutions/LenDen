import { NextResponse } from 'next/server';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    // Strictly requires SUPER_ADMIN role
    await requireSuperAdmin();

    const businesses = await prisma.business.findMany({
      where: { isDemo: false, id: { not: { startsWith: 'demo_' } } },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: businesses.length,
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        legalName: b.legalName,
        tradeType: b.tradeType,
        gstin: b.gstin,
        createdAt: b.createdAt,
        owner: b.memberships.find((m) => m.role === 'BUSINESS_OWNER')?.user || null,
        subscription: b.subscriptions[0] || null,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
