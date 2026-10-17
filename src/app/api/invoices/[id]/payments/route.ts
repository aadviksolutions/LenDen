import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { recordPayment } from '@/lib/services/paymentService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;
    const body = await req.json();

    const result = await recordPayment(business.id, {
      invoiceId: id,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        invoice: result.updatedInvoice,
        isDuplicate: result.isDuplicate,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to record payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
