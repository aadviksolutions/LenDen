import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { testWhatsAppConnection } from '@/lib/services/whatsappService';

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const body = await req.json().catch(() => ({}));

    const result = await testWhatsAppConnection(business.id, {
      phoneNumberId: body.phoneNumberId,
      accessToken: body.accessToken,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error validating WhatsApp credentials';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
