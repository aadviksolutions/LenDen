import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import {
  buildWhatsAppClickToChatUrl,
  buildInvoiceShareMessage,
  buildPaymentReceiptMessage,
  buildStatementMessage,
  sanitizePhoneNumber,
} from '@/lib/whatsapp/formatters';
import { generateShareToken } from '@/lib/whatsapp/shareTokens';
import { logManualWhatsAppShare } from '@/lib/services/whatsappService';

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    const {
      type, // 'INVOICE' | 'RECEIPT' | 'STATEMENT'
      invoiceId,
      paymentId,
      customerId,
      customPhone,
      logShare = true,
    } = body;

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    if (type === 'INVOICE') {
      if (!invoiceId) {
        return NextResponse.json({ success: false, error: 'invoiceId is required' }, { status: 400 });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, businessId: business.id },
        include: { customer: true },
      });

      if (!invoice) {
        return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }

      const token = generateShareToken('INVOICE', invoice.id, business.id, 336); // 14 days
      const docUrl = `${origin}/view/invoice/${invoice.id}?token=${token}`;

      const phoneToUse = customPhone || invoice.customerMobile;
      const sanitized = sanitizePhoneNumber(phoneToUse);

      const message = buildInvoiceShareMessage({
        customerName: invoice.customerName,
        businessName: business.name,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        total: invoice.total,
        balanceDue: invoice.balanceDue,
        documentUrl: docUrl,
      });

      const clickToChatUrl = buildWhatsAppClickToChatUrl(phoneToUse, message);

      if (logShare) {
        await logManualWhatsAppShare(business.id, {
          recipientPhone: phoneToUse,
          recipientName: invoice.customerName,
          messageType: 'INVOICE_SHARE',
          contentSummary: message.slice(0, 500),
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          actor: session.user.name || 'Staff',
        });
      }

      return NextResponse.json({
        success: true,
        type: 'INVOICE',
        recipientPhone: phoneToUse,
        sanitizedPhone: sanitized,
        message,
        clickToChatUrl,
        documentUrl: docUrl,
        token,
      });
    }

    if (type === 'RECEIPT') {
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'paymentId is required' }, { status: 400 });
      }

      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, businessId: business.id },
        include: { invoice: true, customer: true },
      });

      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
      }

      const token = generateShareToken('INVOICE', payment.invoice.id, business.id, 336);
      const docUrl = `${origin}/view/invoice/${payment.invoice.id}?token=${token}`;

      const phoneToUse = customPhone || payment.customer.mobile;
      const sanitized = sanitizePhoneNumber(phoneToUse);

      const message = buildPaymentReceiptMessage({
        customerName: payment.customer.name,
        businessName: business.name,
        invoiceNumber: payment.invoice.invoiceNumber,
        amountPaid: payment.amount,
        paymentMethod: payment.paymentMethod.replace('_', ' '),
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        remainingBalance: payment.invoice.balanceDue,
        receiptUrl: docUrl,
      });

      const clickToChatUrl = buildWhatsAppClickToChatUrl(phoneToUse, message);

      if (logShare) {
        await logManualWhatsAppShare(business.id, {
          recipientPhone: phoneToUse,
          recipientName: payment.customer.name,
          messageType: 'PAYMENT_RECEIPT',
          contentSummary: message.slice(0, 500),
          customerId: payment.customerId,
          invoiceId: payment.invoiceId,
          actor: session.user.name || 'Staff',
        });
      }

      return NextResponse.json({
        success: true,
        type: 'RECEIPT',
        recipientPhone: phoneToUse,
        sanitizedPhone: sanitized,
        message,
        clickToChatUrl,
        documentUrl: docUrl,
        token,
      });
    }

    if (type === 'STATEMENT') {
      if (!customerId) {
        return NextResponse.json({ success: false, error: 'customerId is required' }, { status: 400 });
      }

      const customer = await prisma.customer.findFirst({
        where: { id: customerId, businessId: business.id },
        include: { invoices: true },
      });

      if (!customer) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      const unpaidTotal = customer.invoices.reduce((acc, inv) => {
        return inv.status !== 'CANCELLED' ? acc + inv.balanceDue : acc;
      }, customer.openingBalance);

      const phoneToUse = customPhone || customer.mobile;
      const sanitized = sanitizePhoneNumber(phoneToUse);

      const message = buildStatementMessage({
        customerName: customer.name,
        businessName: business.name,
        totalOutstanding: unpaidTotal,
      });

      const clickToChatUrl = buildWhatsAppClickToChatUrl(phoneToUse, message);

      if (logShare) {
        await logManualWhatsAppShare(business.id, {
          recipientPhone: phoneToUse,
          recipientName: customer.name,
          messageType: 'ACCOUNT_STATEMENT',
          contentSummary: message.slice(0, 500),
          customerId: customer.id,
          actor: session.user.name || 'Staff',
        });
      }

      return NextResponse.json({
        success: true,
        type: 'STATEMENT',
        recipientPhone: phoneToUse,
        sanitizedPhone: sanitized,
        message,
        clickToChatUrl,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid share type' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate WhatsApp share link';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
