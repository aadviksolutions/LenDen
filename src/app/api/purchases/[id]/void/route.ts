import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { voidPurchase } from '@/lib/services/purchaseService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireGrowthAccess();
    const { id } = await params;
    const body = await req.json();

    const reason = body.reason?.trim();
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Cancellation reason is mandatory.' },
        { status: 400 }
      );
    }

    const purchase = await voidPurchase(
      business.id,
      id,
      reason,
      session.user.name || 'Authorized Staff'
    );

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to void purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
