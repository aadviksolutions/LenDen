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
    const { id: businessId } = await params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, platformRole: true },
            },
          },
        },
        _count: {
          select: {
            invoices: true,
            customers: true,
            products: true,
            suppliers: true,
            purchases: true,
            expenses: true,
            khataContacts: true,
            khataTransactions: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      business,
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
    const { id: businessId } = await params;
    const body = await request.json();

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const currentSub = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSub) {
      return NextResponse.json({ error: 'No subscription record found' }, { status: 404 });
    }

    const updateData: any = {};
    const auditActions: string[] = [];
    const reason = body.reason?.trim() || 'Super Admin workspace adjustment';

    // 1. Status Toggle (ACTIVE / SUSPENDED)
    if (body.status && Object.values(SubscriptionStatus).includes(body.status)) {
      updateData.status = body.status;
      auditActions.push(body.status === 'SUSPENDED' ? 'TENANT_SUSPEND' : 'TENANT_REACTIVATE');
    }

    // 2. Plan Adjustment
    if (body.plan && Object.values(SubscriptionPlan).includes(body.plan)) {
      const normalizedPlan = normalizePlanKey(body.plan);
      const planConfig = OFFICIAL_PLANS[normalizedPlan];
      if (planConfig) {
        updateData.plan = body.plan;
        updateData.monthlyPrice = planConfig.pricing.MONTHLY.totalPrice;
        updateData.maxMonthlyInvoices = planConfig.limits.maxMonthlyInvoices;
        updateData.maxStaffSeats = planConfig.limits.maxUsers;
        auditActions.push('PLAN_CORRECTION');
      }
    }

    // 3. Trial Extension
    if (body.trialDaysExtension) {
      const additionalDays = parseInt(body.trialDaysExtension, 10);
      if (!isNaN(additionalDays) && additionalDays > 0) {
        const currentRemaining = currentSub.trialDaysRemaining || 0;
        updateData.trialDaysRemaining = currentRemaining + additionalDays;
        const currentEnd = currentSub.endDate ? new Date(currentSub.endDate) : new Date();
        updateData.endDate = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);
        auditActions.push('TRIAL_EXTENSION');
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: currentSub.id },
      data: updateData,
    });

    // Record audit log
    for (const action of auditActions) {
      await recordAdminAudit(adminSession, {
        action,
        targetType: 'BUSINESS',
        targetId: business.id,
        targetName: business.name,
        reason,
        metadata: {
          previousSub: {
            plan: currentSub.plan,
            status: currentSub.status,
            trialDaysRemaining: currentSub.trialDaysRemaining,
          },
          updatedSub: {
            plan: updated.plan,
            status: updated.status,
            trialDaysRemaining: updated.trialDaysRemaining,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Tenant ${business.name} subscription successfully updated!`,
      subscription: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
