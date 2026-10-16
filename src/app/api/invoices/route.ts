import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess } from '@/lib/auth/guards';
import { getInvoices, createInvoice } from '@/lib/services/invoiceService';
import { InvoiceStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireCommercialAccess();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const status = (searchParams.get('status') as InvoiceStatus) || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const invoices = await getInvoices(business.id, {
      search,
      customerId,
      status,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Commercial plan required') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireCommercialAccess();
    const body = await req.json();

    const invoice = await createInvoice(business.id, session.user.id, body);

    return NextResponse.json(
      {
        success: true,
        invoice,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
