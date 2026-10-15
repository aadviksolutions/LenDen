import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { voidInvoice } from '@/lib/services/invoiceService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireTenantAccess();
    const { id } = await params;
    const body = await req.json();

    const cancelledInvoice = await voidInvoice(
      business.id,
      id,
      body.reason,
      session.user.name
    );

    return NextResponse.json({
      success: true,
      invoice: cancelledInvoice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to void invoice.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
