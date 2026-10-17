import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { recordAdminAudit } from '@/lib/admin/audit';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { OFFICIAL_PLANS, normalizePlanKey } from '@/lib/subscription/plans';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id: userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            business: {
              include: {
                subscriptions: {
                  orderBy: { createdAt: 'desc' },
                },
                _count: {
                  select: {
                    invoices: true,
                    customers: true,
                    products: true,
                  },
                },
              },
            },
          },
        },
        sessions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            khataContacts: true,
            khataTransactions: true,
            khataRepayments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        platformRole: user.platformRole,
        isSuspended: (user as any).isSuspended || false,
        suspendedReason: (user as any).suspendedReason || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          role: m.role,
          business: {
            id: m.business.id,
            name: m.business.name,
            tradeType: m.business.tradeType,
            gstin: m.business.gstin,
            subscriptions: m.business.subscriptions,
            counts: m.business._count,
          },
        })),
        sessions: user.sessions,
        khataCounts: user._count,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireSuperAdmin();
    const { id: userId } = await params;
    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 1. Suspension / Reactivation
    if (typeof body.isSuspended === 'boolean') {
      const reason = body.reason?.trim() || (body.isSuspended ? 'Administrative suspension' : 'Reactivated by Super Admin');

      await (prisma as any).user.update({
        where: { id: userId },
        data: {
          isSuspended: body.isSuspended,
          suspendedReason: body.isSuspended ? reason : null,
        },
      });

      // If suspended, revoke active sessions immediately
      if (body.isSuspended) {
        await prisma.session.deleteMany({
          where: { userId },
        });
      }

      await recordAdminAudit(adminSession, {
        action: body.isSuspended ? 'USER_SUSPEND' : 'USER_REACTIVATE',
        targetType: 'USER',
        targetId: user.id,
        targetName: user.name,
        reason,
        metadata: {
          email: user.email,
          previousState: (user as any).isSuspended,
          newState: body.isSuspended,
        },
      });

      return NextResponse.json({
        success: true,
        message: `User ${user.name} has been ${body.isSuspended ? 'suspended' : 'reactivated'}.`,
      });
    }

    // 2. Plan Correction
    if (body.plan) {
      const targetPlan = body.plan;
      const normalizedPlan = normalizePlanKey(targetPlan);
      const planConfig = OFFICIAL_PLANS[normalizedPlan];
      const reason = body.reason?.trim() || 'Administrative plan correction';

      if (!planConfig) {
        return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
      }

      const primaryBiz = user.memberships[0]?.business;
      if (!primaryBiz) {
        return NextResponse.json({ error: 'User has no associated business workspace' }, { status: 400 });
      }

      const currentSub = primaryBiz.subscriptions[0];
      let updatedSub;

      if (currentSub) {
        updatedSub = await prisma.subscription.update({
          where: { id: currentSub.id },
          data: {
            plan: targetPlan as SubscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: planConfig.pricing.MONTHLY.totalPrice,
            maxMonthlyInvoices: planConfig.limits.maxMonthlyInvoices,
            maxStaffSeats: planConfig.limits.maxUsers,
          },
        });
      } else {
        updatedSub = await prisma.subscription.create({
          data: {
            businessId: primaryBiz.id,
            plan: targetPlan as SubscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: planConfig.pricing.MONTHLY.totalPrice,
            maxMonthlyInvoices: planConfig.limits.maxMonthlyInvoices,
            maxStaffSeats: planConfig.limits.maxUsers,
          },
        });
      }

      await recordAdminAudit(adminSession, {
        action: 'PLAN_CORRECTION',
        targetType: 'SUBSCRIPTION',
        targetId: updatedSub.id,
        targetName: primaryBiz.name,
        reason,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          previousPlan: currentSub?.plan || 'NONE',
          newPlan: targetPlan,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Plan for ${user.name} (${primaryBiz.name}) updated to ${targetPlan}.`,
        subscription: updatedSub,
      });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
