import { NextRequest, NextResponse } from 'next/server';
import { enterDemoWorkspace } from '@/lib/demo/demoService';
import { normalizePlanKey, PlanKey } from '@/lib/subscription/plans';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPlan = body.plan || 'STARTER';
    const planKey: PlanKey = normalizePlanKey(rawPlan);

    const { sessionToken, expiresAt, config } = await enterDemoWorkspace(planKey);

    const response = NextResponse.json({
      success: true,
      message: `Entered ${config.businessName}`,
      redirectUrl: '/',
      plan: config.planKey,
      businessId: config.businessId,
      businessName: config.businessName,
    });

    // Set HTTP-only secure cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to enter demo workspace' },
      { status: 500 }
    );
  }
}
