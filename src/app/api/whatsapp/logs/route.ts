import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getWhatsAppMessageLogs } from '@/lib/services/whatsappService';
import { WhatsAppMessageStatus, WhatsAppMessageType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') as WhatsAppMessageStatus | null;
    const messageType = searchParams.get('messageType') as WhatsAppMessageType | null;
    const customerId = searchParams.get('customerId') || undefined;
    const invoiceId = searchParams.get('invoiceId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getWhatsAppMessageLogs(business.id, {
      status: status || undefined,
      messageType: messageType || undefined,
      customerId,
      invoiceId,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve WhatsApp message logs';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
