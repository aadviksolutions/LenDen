import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getWhatsAppConfig, updateWhatsAppConfig } from '@/lib/services/whatsappService';

export async function GET() {
  try {
    const { business } = await requireTenantAccess();
    const config = await getWhatsAppConfig(business.id);
    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve WhatsApp configuration';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { business, userRole } = await requireTenantAccess();

    if (userRole !== 'BUSINESS_OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only Business Owners can update WhatsApp integration credentials.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = await updateWhatsAppConfig(business.id, {
      phoneNumberId: body.phoneNumberId,
      wabaId: body.wabaId,
      accessToken: body.accessToken,
      webhookVerifyToken: body.webhookVerifyToken,
      businessDisplayName: body.businessDisplayName,
      autoRemindersEnabled: body.autoRemindersEnabled,
      reminderDaysBeforeDue: body.reminderDaysBeforeDue,
      reminderOnDueDate: body.reminderOnDueDate,
      reminderDaysAfterDue: body.reminderDaysAfterDue,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
      isPaused: body.isPaused,
      status: body.status,
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update WhatsApp configuration';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
