import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { recordAdminAudit } from '@/lib/admin/audit';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { OFFICIAL_PLANS, normalizePlanKey } from '@/lib/subscription/plans';

export async function POST(request: NextRequest) {
  try {
    const adminSession = await requireSuperAdmin();
    const body = await request.json();

    const {
      paymentId,
      action, // "CONFIRM_PAYMENT" | "RECORD_REFUND" | "CREATE_MANUAL_PAYMENT"
      businessId,
      plan,
      amount,
      gateway,
      gatewayTransactionId,
      reason,
      notes,
    } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A valid justification reason (at least 5 characters) is required for payment reconciliation.' },
        { status: 400 }
      );
    }

    // 1. CONFIRM PENDING PAYMENT
    if (action === 'CONFIRM_PAYMENT') {
      if (!paymentId) {
        return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
      }

      const payment = await (prisma as any).subscriptionPayment.findUnique({
        where: { id: paymentId },
        include: { business: true },
      });

      if (!payment) {
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      if (payment.status === 'SUCCESS') {
        return NextResponse.json({ error: 'Payment is already confirmed and successful' }, { status: 400 });
      }

      // Update payment to SUCCESS
      const updatedPayment = await (prisma as any).subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESS',
          paidAt: new Date(),
          gatewayPaymentId: gatewayTransactionId || payment.gatewayPaymentId,
          notes: notes || payment.notes,
          reconciledBy: adminSession.user.email,
        },
      });

      // Activate or extend business subscription
      const normalizedPlan = normalizePlanKey(payment.plan);
      const planConfig = OFFICIAL_PLANS[normalizedPlan];

      const existingSub = await prisma.subscription.findFirst({
        where: { businessId: payment.businessId },
        orderBy: { createdAt: 'desc' },
      });

      const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan: payment.plan as SubscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: planConfig?.pricing.MONTHLY.totalPrice ?? payment.amount,
            maxMonthlyInvoices: planConfig?.limits.maxMonthlyInvoices ?? 999999,
            maxStaffSeats: planConfig?.limits.maxUsers ?? 1,
            endDate: newEndDate,
          },
        });
      }

      await recordAdminAudit(adminSession, {
        action: 'PAYMENT_RECONCILE',
        targetType: 'PAYMENT',
        targetId: payment.id,
        targetName: `Payment ₹${payment.amount} for ${payment.business.name}`,
        reason,
        metadata: {
          previousStatus: payment.status,
          newStatus: 'SUCCESS',
          gatewayTransactionId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Payment of ₹${payment.amount} confirmed. Subscription activated.`,
        payment: updatedPayment,
      });
    }

    // 2. RECORD REFUND
    if (action === 'RECORD_REFUND') {
      if (!paymentId) {
        return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
      }

      const payment = await (prisma as any).subscriptionPayment.findUnique({
        where: { id: paymentId },
        include: { business: true },
      });

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      const refundAmount = amount ? parseFloat(amount) : payment.amount;

      const updatedPayment = await (prisma as any).subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundAmount,
          notes: notes ? `${payment.notes || ''} | Refund note: ${notes}` : payment.notes,
          reconciledBy: adminSession.user.email,
        },
      });

      await recordAdminAudit(adminSession, {
        action: 'PAYMENT_REFUND',
        targetType: 'PAYMENT',
        targetId: payment.id,
        targetName: `Refund ₹${refundAmount} for ${payment.business.name}`,
        reason,
        metadata: {
          refundAmount,
          originalAmount: payment.amount,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Refund of ₹${refundAmount} recorded successfully.`,
        payment: updatedPayment,
      });
    }

    // 3. CREATE MANUAL OFFLINE / BANK PAYMENT
    if (action === 'CREATE_MANUAL_PAYMENT') {
      if (!businessId || !plan || !amount) {
        return NextResponse.json({ error: 'businessId, plan, and amount are required' }, { status: 400 });
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      const normalizedPlan = normalizePlanKey(plan);
      const planConfig = OFFICIAL_PLANS[normalizedPlan];
      const parsedAmount = parseFloat(amount);

      const newPayment = await (prisma as any).subscriptionPayment.create({
        data: {
          businessId,
          plan: plan as SubscriptionPlan,
          amount: parsedAmount,
          currency: 'INR',
          status: 'SUCCESS',
          gateway: gateway || 'BANK_TRANSFER',
          gatewayPaymentId: gatewayTransactionId || `MANUAL-${Date.now()}`,
          notes,
          reconciledBy: adminSession.user.email,
          paidAt: new Date(),
        },
      });

      // Update subscription
      const existingSub = await prisma.subscription.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
      });

      const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan: plan as SubscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: planConfig?.pricing.MONTHLY.totalPrice ?? parsedAmount,
            maxMonthlyInvoices: planConfig?.limits.maxMonthlyInvoices ?? 999999,
            maxStaffSeats: planConfig?.limits.maxUsers ?? 1,
            endDate: newEndDate,
          },
        });
      }

      await recordAdminAudit(adminSession, {
        action: 'CREATE_MANUAL_PAYMENT',
        targetType: 'PAYMENT',
        targetId: newPayment.id,
        targetName: `Manual payment ₹${parsedAmount} for ${business.name}`,
        reason,
        metadata: {
          amount: parsedAmount,
          plan,
          gateway: gateway || 'BANK_TRANSFER',
          gatewayTransactionId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Manual payment of ₹${parsedAmount} recorded and subscription activated for ${business.name}.`,
        payment: newPayment,
      });
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
