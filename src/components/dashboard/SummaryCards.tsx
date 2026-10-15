'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  Clock,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface SummaryCardsProps {
  customMetrics?: {
    totalSales?: number;
    todaysSales?: number;
    totalCollected?: number;
    totalOutstanding?: number;
    pendingInvoicesCount?: number;
    pendingInvoicesAmount?: number;
    invoiceCount?: number;
  };
}

interface SummaryData {
  totalSalesTurnover: number;
  todaysSales: number;
  totalPaidCollections: number;
  totalUdhaarDue: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  invoiceCount: number;
  overdueAmount: number;
}

export function SummaryCards({ customMetrics }: SummaryCardsProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/reports/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!active) return;
        if (resData?.summary) {
          setData({
            totalSalesTurnover: resData.summary.totalSalesTurnover ?? 0,
            todaysSales: resData.summary.todaysSales ?? 0,
            totalPaidCollections: resData.summary.totalPaidCollections ?? 0,
            totalUdhaarDue: resData.summary.totalUdhaarDue ?? 0,
            pendingInvoicesCount: resData.summary.pendingInvoicesCount ?? 0,
            pendingInvoicesAmount: resData.summary.pendingInvoicesAmount ?? 0,
            invoiceCount: resData.summary.invoiceCount ?? 0,
            overdueAmount: resData.summary.overdueAmount ?? 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalSales = customMetrics?.totalSales ?? data?.totalSalesTurnover ?? 0;
  const todaysSales = customMetrics?.todaysSales ?? data?.todaysSales ?? 0;
  const totalCollected = customMetrics?.totalCollected ?? data?.totalPaidCollections ?? 0;
  const totalUdhaar = customMetrics?.totalOutstanding ?? data?.totalUdhaarDue ?? 0;
  const pendingCount = customMetrics?.pendingInvoicesCount ?? data?.pendingInvoicesCount ?? 0;
  const pendingAmount = customMetrics?.pendingInvoicesAmount ?? data?.pendingInvoicesAmount ?? 0;
  const invoiceCount = customMetrics?.invoiceCount ?? data?.invoiceCount ?? 0;
  const overdueAmount = data?.overdueAmount ?? 0;

  if (loading && !data && !customMetrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-white rounded-xl border border-slate-200/80 p-4.5 animate-pulse flex flex-col justify-between"
          >
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-8 bg-slate-100 rounded w-36" />
            <div className="h-4 bg-slate-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Sales */}
      <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Sales
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00B887] border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-black text-[#071F38] tracking-tight tabular-nums">
            ₹{totalSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">INR</span>
        </div>

        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 font-semibold text-[#00B887] bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
            <ArrowUpRight className="w-3 h-3" />
            ₹{todaysSales.toLocaleString('en-IN')} today
          </span>
          <span className="text-slate-400 text-[11px] font-medium">
            {invoiceCount} {invoiceCount === 1 ? 'bill' : 'bills'}
          </span>
        </div>
      </div>

      {/* 2. Amount Collected */}
      <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Amount Collected
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00B887] border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-black text-[#00B887] tracking-tight tabular-nums">
            ₹{totalCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">INR</span>
        </div>

        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00B887]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cash & UPI Receipts
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-[#00B887] px-1.5 py-0.2 rounded border border-emerald-200">
            Settled
          </span>
        </div>
      </div>

      {/* 3. Outstanding Udhaar */}
      <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Outstanding Udhaar
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#071F38] border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-black text-[#071F38] tracking-tight tabular-nums">
            ₹{totalUdhaar.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">INR</span>
        </div>

        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
          {overdueAmount > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[11px] font-semibold border border-amber-200">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              ₹{overdueAmount.toLocaleString('en-IN')} overdue
            </span>
          ) : (
            <span className="text-slate-500 text-[11px] font-medium">
              Customer Ledger Due
            </span>
          )}
          <span className="text-slate-400 text-[11px]">
            Khata Active
          </span>
        </div>
      </div>

      {/* 4. Pending Invoices */}
      <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Pending Invoices
          </span>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#008F91] border border-teal-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-black text-[#071F38] tracking-tight tabular-nums">
            {pendingCount}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {pendingCount === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-[#008F91]">
            ₹{pendingAmount.toLocaleString('en-IN')} balance
          </span>
          <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 uppercase">
            Awaiting
          </span>
        </div>
      </div>
    </div>
  );
}
