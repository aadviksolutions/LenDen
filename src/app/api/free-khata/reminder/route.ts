import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { prepareWhatsAppReminder } from '@/lib/services/khataService';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const body = await req.json();
    const { transactionId, contactId, customMessage } = body;

    let contactName = '';
    let phone: string | null = null;
    let amount = 0;
    let date: Date = new Date();
    let dueDate: Date | null = null;
    let type: 'GAVE' | 'RECEIVED' = 'GAVE';

    if (transactionId) {
      const tx = await prisma.khataTransaction.findFirst({
        where: { id: transactionId, businessId: business.id },
        include: { contact: true },
      });

      if (!tx) {
        return NextResponse.json(
          { success: false, error: 'Transaction not found or access denied.' },
          { status: 404 }
        );
      }

      contactName = tx.contact.name;
      phone = tx.contact.phone;
      amount = tx.balanceAmount;
      date = tx.date;
      dueDate = tx.dueDate;
      type = tx.type;
    } else if (contactId) {
      const contact = await prisma.khataContact.findFirst({
        where: { id: contactId, businessId: business.id },
        include: {
          transactions: {
            where: { balanceAmount: { gt: 0 } },
            orderBy: { date: 'asc' },
          },
        },
      });

      if (!contact) {
        return NextResponse.json(
          { success: false, error: 'Contact not found or access denied.' },
          { status: 404 }
        );
      }

      contactName = contact.name;
      phone = contact.phone;

      // Net balance calculation
      const gaveBal = contact.transactions
        .filter((t) => t.type === 'GAVE')
        .reduce((sum, t) => sum + t.balanceAmount, 0);
      const recBal = contact.transactions
        .filter((t) => t.type === 'RECEIVED')
        .reduce((sum, t) => sum + t.balanceAmount, 0);

      const net = gaveBal - recBal;
      amount = Math.abs(net);
      type = net >= 0 ? 'GAVE' : 'RECEIVED';
      date = contact.transactions[0]?.date || new Date();
      dueDate = contact.transactions.find((t) => t.dueDate)?.dueDate || null;
    } else {
      return NextResponse.json(
        { success: false, error: 'transactionId or contactId is required.' },
        { status: 400 }
      );
    }

    const reminder = prepareWhatsAppReminder({
      contactName,
      phone,
      amount,
      date,
      dueDate,
      type,
      customMessage,
    });

    return NextResponse.json({
      success: true,
      reminder,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to prepare WhatsApp reminder.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
