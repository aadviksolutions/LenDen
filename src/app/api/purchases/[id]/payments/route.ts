import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { recordSupplierPayment } from '@/lib/services/purchaseService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireGrowthAccess();
    const { id } = await params;
    const body = await req.json();

    const result = await recordSupplierPayment(
      business.id,
      {
        purchaseId: id,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        paymentDate: body.paymentDate,
        referenceNumber: body.referenceNumber,
        notes: body.notes,
        idempotencyKey: body.idempotencyKey,
      },
      session.user.name || 'Staff'
    );

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        purchase: result.updatedPurchase,
        isDuplicate: result.isDuplicate,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record supplier payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
