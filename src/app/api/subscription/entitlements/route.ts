import { NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getBusinessEntitlements } from '@/lib/subscription/entitlements';

export async function GET() {
  try {
    const { business } = await requireTenantAccess();
    const entitlements = await getBusinessEntitlements(business.id);

    return NextResponse.json({
      success: true,
      entitlements,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch entitlements' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
