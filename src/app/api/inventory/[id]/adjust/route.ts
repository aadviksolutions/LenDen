import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { adjustStock } from '@/lib/services/inventoryService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireCommercialAccess();
    const { id } = await params;
    const body = await req.json();

    const result = await adjustStock(business.id, id, {
      quantityAdjustment: Number(body.quantityAdjustment),
      reason: body.reason,
      actorName: session.user.name || 'Staff',
    });

    return NextResponse.json({
      success: true,
      product: result.product,
      movement: result.movement,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to adjust stock.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
