import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAccess } from '@/lib/auth/guards';
import { InvoiceStatus, PurchaseStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess();
    const businessId = authContext.business.id;

    // Fetch non-cancelled invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { not: InvoiceStatus.CANCELLED },
      },
      orderBy: { invoiceDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        customerGstin: true,
        subtotal: true,
        taxTotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        total: true,
        paidAmount: true,
        balanceDue: true,
        status: true,
      },
    });

    // Aggregate Invoices
    const totalSalesTurnover = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const taxableSalesValue = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalSalesTax = invoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
    const totalCgst = invoices.reduce((sum, inv) => sum + inv.cgstTotal, 0);
    const totalSgst = invoices.reduce((sum, inv) => sum + inv.sgstTotal, 0);
    const totalIgst = invoices.reduce((sum, inv) => sum + inv.igstTotal, 0);
    const totalPaidCollections = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalUdhaarDue = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const now = new Date();

    const todaysInvoices = invoices.filter((inv) => new Date(inv.invoiceDate) >= startOfToday);
    const todaysSales = todaysInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const todaysBillsCount = todaysInvoices.length;

    const overdueInvoices = invoices.filter(
      (inv) => inv.balanceDue > 0 && new Date(inv.invoiceDate) < now && inv.status === InvoiceStatus.OVERDUE
    );
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    // Fetch received purchases for ITC and procurement
    const purchases = await prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: PurchaseStatus.CANCELLED },
      },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        subtotal: true,
        taxTotal: true,
        total: true,
        supplier: {
          select: {
            name: true,
            gstin: true,
          },
        },
      },
    });

    const totalProcurement = purchases.reduce((sum, p) => sum + p.total, 0);
    const taxableProcurement = purchases.reduce((sum, p) => sum + p.subtotal, 0);
    const totalItcTax = purchases.reduce((sum, p) => sum + p.taxTotal, 0);

    // Fetch recorded expenses
    const expenses = await prisma.expense.findMany({
      where: { businessId },
      select: {
        id: true,
        category: true,
        amount: true,
        expenseDate: true,
      },
    });

    const totalOverheads = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Net GST liability = Output GST - Input Tax Credit
    const netGstPayable = Math.max(0, totalSalesTax - totalItcTax);

    // Gross Profit = Taxable Sales - Taxable Procurement
    const grossProfit = taxableSalesValue - taxableProcurement;
    // Net Profit = Gross Profit - Overheads
    const netProfit = grossProfit - totalOverheads;

    // Pending Invoices
    const pendingInvoices = invoices.filter(
      (inv) => inv.balanceDue > 0 && inv.status !== InvoiceStatus.PAID
    );
    const pendingInvoicesCount = pendingInvoices.length;
    const pendingInvoicesAmount = pendingInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    // 7-Day Live Trend (Daily Sales vs Collections)
    const trendDays: Array<{ date: string; label: string; sales: number; collections: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      trendDays.push({ date: dateStr, label: dayLabel, sales: 0, collections: 0 });
    }

    // 6-Month Trend (Monthly Sales vs Collections)
    const monthlyTrend: Array<{ month: string; label: string; sales: number; collections: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short' });
      monthlyTrend.push({ month: monthKey, label: monthLabel, sales: 0, collections: 0 });
    }

    invoices.forEach((inv) => {
      const invDate = new Date(inv.invoiceDate);
      const dateStr = invDate.toISOString().split('T')[0];
      const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;

      const day = trendDays.find((t) => t.date === dateStr);
      if (day) {
        day.sales += inv.total;
        day.collections += inv.paidAmount;
      }

      const m = monthlyTrend.find((item) => item.month === monthKey);
      if (m) {
        m.sales += inv.total;
        m.collections += inv.paidAmount;
      }
    });

    return NextResponse.json({
      summary: {
        totalSalesTurnover,
        taxableSalesValue,
        totalSalesTax,
        totalCgst,
        totalSgst,
        totalIgst,
        totalPaidCollections,
        totalUdhaarDue,
        totalProcurement,
        taxableProcurement,
        totalItcTax,
        netGstPayable,
        totalOverheads,
        grossProfit,
        netProfit,
        todaysSales,
        todaysBillsCount,
        overdueAmount,
        pendingInvoicesCount,
        pendingInvoicesAmount,
        invoiceCount: invoices.length,
        purchaseCount: purchases.length,
        expenseCount: expenses.length,
        trendDays,
        monthlyTrend,
      },
      salesRegister: invoices,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to aggregate report data' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
