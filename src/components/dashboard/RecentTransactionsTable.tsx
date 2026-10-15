'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SAMPLE_TRANSACTIONS } from '@/data/mockData';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface RecentTransactionsTableProps {
  onViewInvoice?: (invoice: any) => void;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerMobile: string;
  invoiceDate: string;
  dueDate?: string;
  total: number;
  balanceDue: number;
  status: string;
}

export function RecentTransactionsTable({
  onViewInvoice,
}: RecentTransactionsTableProps) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  useEffect(() => {
    let active = true;
    fetch('/api/invoices')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.success && Array.isArray(data.invoices) && data.invoices.length > 0) {
          const mapped: InvoiceRow[] = data.invoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || inv.customer?.name || 'Walk-in Customer',
            customerMobile: inv.customerMobile || inv.customer?.mobile || '',
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            total: inv.total,
            balanceDue: inv.balanceDue,
            status: inv.status,
          }));
          setInvoices(mapped);
        } else {
          // Gracefully fall back to sample transactions if database is fresh
          const fallback: InvoiceRow[] = SAMPLE_TRANSACTIONS.map((tx) => ({
            id: tx.id,
            invoiceNumber: tx.invoiceNumber,
            customerName: tx.partyName,
            customerMobile: tx.partyPhone,
            invoiceDate: tx.date,
            dueDate: tx.dueDate,
            total: tx.amount,
            balanceDue: tx.status === 'PAID' ? 0 : tx.amount - tx.paidAmount,
            status: tx.status === 'PENDING' ? 'UNPAID' : tx.status,
          }));
          setInvoices(fallback);
        }
      })
      .catch(() => {
        if (!active) return;
        const fallback: InvoiceRow[] = SAMPLE_TRANSACTIONS.map((tx) => ({
          id: tx.id,
          invoiceNumber: tx.invoiceNumber,
          customerName: tx.partyName,
          customerMobile: tx.partyPhone,
          invoiceDate: tx.date,
          dueDate: tx.dueDate,
          total: tx.amount,
          balanceDue: tx.status === 'PAID' ? 0 : tx.amount - tx.paidAmount,
          status: tx.status === 'PENDING' ? 'UNPAID' : tx.status,
        }));
        setInvoices(fallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = invoices.filter((inv) => {
    if (filter === 'PAID') return inv.status === 'PAID';
    if (filter === 'UNPAID') return inv.status !== 'PAID' && inv.status !== 'CANCELLED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00B887] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-[#00B887]" />
            Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-amber-600" />
            Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Overdue
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Void
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#071F38] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-slate-500" />
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#008F91]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              Recent Invoices & Transactions
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Latest customer billing records and settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
            {(['ALL', 'UNPAID', 'PAID'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-white text-[#071F38] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'UNPAID' ? 'Pending / Udhaar' : 'Settled'}
              </button>
            ))}
          </div>

          <Link
            href="/invoices"
            className="text-xs font-bold text-[#071F38] hover:text-[#00B887] flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
          >
            <span>All Bills</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F6F9FC] border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-4">Invoice #</th>
              <th className="py-2.5 px-4">Customer</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-4 text-right">Amount</th>
              <th className="py-2.5 px-4 text-right">Balance Due</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 7).map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                <td className="py-3 px-4 font-mono font-bold text-[#071F38]">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="hover:text-[#00B887] hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-slate-900 block truncate max-w-[160px]">
                    {inv.customerName}
                  </span>
                  {inv.customerMobile && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {inv.customerMobile}
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                  {inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '—'}
                </td>
                <td className="py-3 px-3">
                  {getStatusBadge(inv.status)}
                </td>
                <td className="py-3 px-4 text-right font-black text-[#071F38] tabular-nums">
                  ₹{Number(inv.total).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-right tabular-nums">
                  {inv.balanceDue > 0 ? (
                    <span className="font-bold text-amber-700">
                      ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">₹0</span>
                  )}
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="p-1 text-slate-500 hover:text-[#071F38] hover:bg-slate-100 rounded transition-colors"
                      title="View bill"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/invoices/${inv.id}/print`}
                      className="p-1 text-slate-500 hover:text-[#00B887] hover:bg-slate-100 rounded transition-colors"
                      title="Print invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
