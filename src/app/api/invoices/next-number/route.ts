import { NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getFiscalYear } from '@/lib/billing/sequence';

export async function GET() {
  try {
    const { business } = await requireTenantAccess();
    const fiscalYear = getFiscalYear();

    const sequence = await prisma.invoiceSequence.findUnique({
      where: { businessId: business.id },
    });

    const prefix = sequence?.prefix || 'INV';
    const nextNumber = (sequence?.currentNumber || 0) + 1;
    const padded = String(nextNumber).padStart(4, '0');
    const estimatedInvoiceNumber = `${prefix}-${fiscalYear}-${padded}`;

    return NextResponse.json({
      success: true,
      nextInvoiceNumber: estimatedInvoiceNumber,
      prefix,
      fiscalYear,
      nextNumber,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get next invoice number';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
