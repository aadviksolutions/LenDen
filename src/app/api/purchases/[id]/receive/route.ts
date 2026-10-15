import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { receivePurchase } from '@/lib/services/purchaseService';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireTenantAccess();
    const { id } = await params;

    const purchase = await receivePurchase(business.id, id, session.user.name || 'Staff');

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to receive purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
