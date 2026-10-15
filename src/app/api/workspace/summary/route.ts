import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, TenantIsolationError, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;

    // Strict Server-Side Tenant Authorization Guard
    const { business, userRole } = await requireTenantAccess(requestedBusinessId);

    // Query data strictly scoped to this business. Never trust client IDs.
    const businessData = await prisma.business.findUnique({
      where: { id: business.id },
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
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: businessData?.id,
        name: businessData?.name,
        legalName: businessData?.legalName,
        tradeType: businessData?.tradeType,
        gstin: businessData?.gstin,
        city: businessData?.city,
        state: businessData?.state,
        userRole,
        membersCount: businessData?.memberships.length || 0,
        subscription: businessData?.subscriptions[0] || null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
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
