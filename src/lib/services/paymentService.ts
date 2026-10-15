import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string | Date;
  referenceNumber?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Records an invoice payment in an atomic transaction.
 * Supports partial payments and prevents duplicate submissions via idempotency keys.
 */
export async function recordPayment(businessId: string, input: RecordPaymentInput) {
  const payAmount = round2(Number(input.amount));

  if (payAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // Idempotency check: if key supplied, check if already recorded
  if (input.idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existingPayment) {
      const currentInvoice = await prisma.invoice.findFirstOrThrow({
        where: { id: existingPayment.invoiceId, businessId },
      });
      return {
        payment: existingPayment,
        updatedInvoice: currentInvoice,
        isDuplicate: true,
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Fetch target invoice with tenant verification
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, businessId },
    });

    if (!invoice) {
      throw new Error('Invoice not found or unauthorized.');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot record payments on a cancelled invoice.');
    }

    if (invoice.status === InvoiceStatus.PAID || invoice.balanceDue <= 0) {
      throw new Error('This invoice is already fully paid.');
    }

    if (payAmount > invoice.balanceDue) {
      throw new Error(
        `Payment amount (₹${payAmount}) exceeds invoice balance due (₹${invoice.balanceDue}).`
      );
    }

    // 2. Create Payment record
    const payment = await tx.payment.create({
      data: {
        businessId,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: payAmount,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        paymentMethod: input.paymentMethod || PaymentMethod.CASH,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey?.trim() || null,
      },
    });

    // 3. Update invoice financial balance and payment status
    const newPaidAmount = round2(invoice.paidAmount + payAmount);
    const newBalanceDue = round2(Math.max(0, invoice.total - newPaidAmount));
    const newStatus: InvoiceStatus =
      newBalanceDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    return {
      payment,
      updatedInvoice,
      isDuplicate: false,
    };
  });
}
