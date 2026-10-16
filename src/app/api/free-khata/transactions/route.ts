import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { createKhataTransaction } from '@/lib/services/khataService';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'GAVE' or 'RECEIVED'
    const contactId = searchParams.get('contactId');
    const status = searchParams.get('status');

    const where: any = { businessId: business.id };
    if (type === 'GAVE' || type === 'RECEIVED') {
      where.type = type;
    }
    if (contactId) {
      where.contactId = contactId;
    }
    if (status) {
      where.status = status;
    }

    const transactions = await prisma.khataTransaction.findMany({
      where,
      include: {
        contact: true,
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    const transaction = await createKhataTransaction(business.id, session.user.id, body);

    return NextResponse.json(
      {
        success: true,
        transaction,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record entry.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
