import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { processWebhookStatusUpdate } from '@/lib/services/whatsappService';

const SERVER_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'lenden_meta_webhook_secret_token';

/**
 * Meta WhatsApp Cloud API Webhook Verification Handshake
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    // Check against global server token or any business's configured webhookVerifyToken
    let isMatch = token === SERVER_VERIFY_TOKEN;

    if (!isMatch) {
      const matchConfig = await prisma.whatsAppConfig.findFirst({
        where: { webhookVerifyToken: token },
      });
      if (matchConfig) {
        isMatch = true;
      }
    }

    if (isMatch) {
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  return NextResponse.json({ error: 'Forbidden. Verification token mismatch.' }, { status: 403 });
}

/**
 * Meta WhatsApp Cloud API Event & Delivery Status Callback
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify payload is for whatsapp business account
    if (body.object === 'whatsapp_business_account') {
      const updates = await processWebhookStatusUpdate(body);
      return NextResponse.json({ success: true, processedUpdates: updates }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error processing webhook event';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
