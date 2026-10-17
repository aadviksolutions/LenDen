import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { getPurchaseById } from '@/lib/services/purchaseService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireGrowthAccess();
    const { id } = await params;

    const purchase = await getPurchaseById(business.id, id);

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch purchase.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Feature not available') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
