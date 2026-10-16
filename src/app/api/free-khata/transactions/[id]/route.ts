import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  updateKhataTransaction,
  deleteKhataTransaction,
} from '@/lib/services/khataService';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;

    const transaction = await prisma.khataTransaction.findFirst({
      where: { id, businessId: business.id },
      include: {
        contact: true,
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
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

    const transaction = await updateKhataTransaction(business.id, id, body);

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update transaction.';
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

    await deleteKhataTransaction(business.id, id);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete transaction.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
