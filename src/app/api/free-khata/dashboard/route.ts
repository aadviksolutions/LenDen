import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getKhataDashboardSummary } from '@/lib/services/khataService';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const summary = await getKhataDashboardSummary(business.id);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Khata dashboard.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
