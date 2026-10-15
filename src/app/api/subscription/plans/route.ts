import { NextResponse } from 'next/server';
import { OFFICIAL_PLANS, BILLING_INTERVALS } from '@/lib/subscription/plans';

export async function GET() {
  return NextResponse.json({
    success: true,
    plans: OFFICIAL_PLANS,
    intervals: BILLING_INTERVALS,
  });
}
