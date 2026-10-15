import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getPurchaseById } from '@/lib/services/purchaseService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
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
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
