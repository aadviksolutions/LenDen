import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getKhataContacts, createKhataContact } from '@/lib/services/khataService';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const contacts = await getKhataContacts(business.id, search);

    return NextResponse.json({
      success: true,
      contacts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Khata contacts.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    const contact = await createKhataContact(business.id, session.user.id, body);

    return NextResponse.json(
      {
        success: true,
        contact,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create Khata contact.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
