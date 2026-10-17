import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { getInvoiceById } from '@/lib/services/invoiceService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;

    const invoice = await getInvoiceById(business.id, id);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve invoice.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
