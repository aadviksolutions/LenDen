import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { sendWhatsAppCloudMessage } from '@/lib/services/whatsappService';

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    const {
      recipientPhone,
      recipientName,
      messageType,
      messageText,
      customerId,
      invoiceId,
      idempotencyKey,
    } = body;

    if (!recipientPhone || !messageText || !messageType) {
      return NextResponse.json(
        { success: false, error: 'recipientPhone, messageText, and messageType are required.' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppCloudMessage({
      businessId: business.id,
      recipientPhone,
      recipientName,
      messageType,
      messageText,
      customerId,
      invoiceId,
      actor: session.user.name || 'Staff',
      idempotencyKey,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send WhatsApp message';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
