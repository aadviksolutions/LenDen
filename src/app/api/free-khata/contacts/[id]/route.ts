import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  getKhataContactDetail,
  deleteKhataContact,
} from '@/lib/services/khataService';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;

    const detail = await getKhataContactDetail(business.id, id);

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contact details.';
    const status = message.includes('Authentication') ? 401 : message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.khataContact.findFirst({
      where: { id, businessId: business.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    const updated = await prisma.khataContact.update({
      where: { id },
      data: {
        name: body.name ? body.name.trim() : undefined,
        phone: body.phone !== undefined ? (body.phone ? body.phone.trim() : null) : undefined,
        email: body.email !== undefined ? (body.email ? body.email.trim().toLowerCase() : null) : undefined,
        notes: body.notes !== undefined ? (body.notes ? body.notes.trim() : null) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      contact: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update contact.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;

    await deleteKhataContact(business.id, id);

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete contact.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
