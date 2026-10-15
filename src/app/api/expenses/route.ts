import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAccess } from '@/lib/auth/guards';
import { PaymentMethod } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {
      businessId: authContext.business.id,
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search && search.trim()) {
      where.OR = [
        { notes: { contains: search.trim(), mode: 'insensitive' } },
        { payee: { contains: search.trim(), mode: 'insensitive' } },
        { referenceNumber: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        ...e,
        description: e.notes,
      })),
      summary: {
        totalAmount,
        count: expenses.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized or failed to fetch expenses' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess(undefined, ['BUSINESS_OWNER', 'ACCOUNTANT']);
    const body = await request.json();

    const { category, payee, description, amount, paymentMethod, expenseDate, referenceNumber } = body;

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid expense amount is required' }, { status: 400 });
    }

    const validPaymentMethod = Object.values(PaymentMethod).includes(paymentMethod)
      ? paymentMethod
      : PaymentMethod.CASH;

    const expense = await prisma.expense.create({
      data: {
        businessId: authContext.business.id,
        category: category.trim(),
        payee: payee?.trim() || 'General Outlay',
        notes: description?.trim() || null,
        amount: parsedAmount,
        paymentMethod: validPaymentMethod,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        referenceNumber: referenceNumber?.trim() || null,
      },
    });

    return NextResponse.json({ expense: { ...expense, description: expense.notes } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record expense' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess(undefined, ['BUSINESS_OWNER', 'ACCOUNTANT']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, businessId: authContext.business.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found or unauthorized' }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
