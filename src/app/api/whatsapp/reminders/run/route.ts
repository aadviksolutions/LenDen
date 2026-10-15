import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { processPaymentReminders } from '@/lib/services/whatsappService';

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const body = await req.json().catch(() => ({}));

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const summary = await processPaymentReminders({
      businessId: business.id,
      dryRun: body.dryRun ?? false,
      ignoreQuietHours: body.ignoreQuietHours ?? false,
      originUrl: origin,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error executing payment reminder engine';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
