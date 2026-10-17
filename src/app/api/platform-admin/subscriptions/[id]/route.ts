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
    const { id } = await params;

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        business: {
          include: {
            memberships: {
              where: { role: 'BUSINESS_OWNER' },
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
          },
        },
        subscriptionPayments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, subscription: sub });
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
    const { id } = await params;
    const body = await request.json();

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const updateData: any = {};
    const auditActions: string[] = [];
    const reason = body.reason?.trim() || 'Administrative subscription update';

    if (body.status && Object.values(SubscriptionStatus).includes(body.status)) {
      updateData.status = body.status as SubscriptionStatus;
      auditActions.push(body.status === 'SUSPENDED' ? 'SUBSCRIPTION_SUSPEND' : 'SUBSCRIPTION_STATUS_CHANGE');
    }

    if (body.plan && Object.values(SubscriptionPlan).includes(body.plan)) {
      const normalizedPlan = normalizePlanKey(body.plan);
      const planConfig = OFFICIAL_PLANS[normalizedPlan];
      if (planConfig) {
        updateData.plan = body.plan as SubscriptionPlan;
        updateData.monthlyPrice = planConfig.pricing.MONTHLY.totalPrice;
        updateData.maxMonthlyInvoices = planConfig.limits.maxMonthlyInvoices;
        updateData.maxStaffSeats = planConfig.limits.maxUsers;
        auditActions.push('PLAN_CORRECTION');
      }
    }

    if (body.extensionDays) {
      const days = parseInt(body.extensionDays, 10);
      if (!isNaN(days) && days > 0) {
        const baseDate = sub.endDate && new Date(sub.endDate) > new Date() ? new Date(sub.endDate) : new Date();
        updateData.endDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        updateData.trialDaysRemaining = (sub.trialDaysRemaining || 0) + days;
        auditActions.push('SUBSCRIPTION_EXTEND');
      }
    }

    if (body.maxMonthlyInvoices && typeof body.maxMonthlyInvoices === 'number') {
      updateData.maxMonthlyInvoices = body.maxMonthlyInvoices;
    }

    if (body.maxStaffSeats && typeof body.maxStaffSeats === 'number') {
      updateData.maxStaffSeats = body.maxStaffSeats;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: updateData,
    });

    for (const action of auditActions) {
      await recordAdminAudit(adminSession, {
        action,
        targetType: 'SUBSCRIPTION',
        targetId: sub.id,
        targetName: sub.business.name,
        reason,
        metadata: {
          previous: { plan: sub.plan, status: sub.status, endDate: sub.endDate },
          updated: { plan: updated.plan, status: updated.status, endDate: updated.endDate },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully.',
      subscription: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
