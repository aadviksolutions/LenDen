import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id: businessId } = await params;
    const body = await request.json();

    const { status, plan, trialDaysExtension } = body;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business tenant not found' }, { status: 404 });
    }

    const currentSub = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSub) {
      return NextResponse.json({ error: 'No subscription record found for tenant' }, { status: 404 });
    }

    const updateData: any = {};

    if (status && Object.values(SubscriptionStatus).includes(status)) {
      updateData.status = status;
    }

    if (plan && Object.values(SubscriptionPlan).includes(plan)) {
      updateData.plan = plan;
      if (plan === 'STARTER') updateData.monthlyPrice = 499;
      if (plan === 'GROWTH_PRO') updateData.monthlyPrice = 999;
      if (plan === 'ENTERPRISE') updateData.monthlyPrice = 2499;
    }

    if (trialDaysExtension) {
      const additionalDays = parseInt(trialDaysExtension, 10);
      if (!isNaN(additionalDays) && additionalDays > 0) {
        updateData.trialDaysRemaining = (currentSub.trialDaysRemaining || 0) + additionalDays;
        updateData.endDate = new Date(Date.now() + ((currentSub.trialDaysRemaining || 0) + additionalDays) * 86400000);
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: currentSub.id },
      data: updateData,
    });

    return NextResponse.json({
      message: `Tenant ${business.name} subscription successfully updated!`,
      subscription: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update tenant status' },
      { status: error.message?.includes('privileges') ? 403 : 500 }
    );
  }
}
