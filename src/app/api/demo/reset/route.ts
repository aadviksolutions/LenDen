import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { seedDemoWorkspace } from '@/lib/demo/demoService';
import { normalizePlanKey } from '@/lib/subscription/plans';

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();

    if (!business.id.startsWith('demo_')) {
      return NextResponse.json(
        { success: false, error: 'Only demo workspaces can be reset.' },
        { status: 403 }
      );
    }

    const planKey = normalizePlanKey(business.subscription?.plan);
    await seedDemoWorkspace(planKey);

    return NextResponse.json({
      success: true,
      message: `Demo workspace for ${planKey} has been reset to original sample state.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset demo workspace' },
      { status: 500 }
    );
  }
}
