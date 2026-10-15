'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SAMPLE_UDHAAR_CUSTOMERS } from '@/data/mockData';
import { MessageSquare, CreditCard, ChevronRight, Users } from 'lucide-react';

interface OutstandingWatchlistProps {
  onSendReminder: (customer: any) => void;
  onRecordCredit: (customer: any) => void;
}

interface CustomerWatchItem {
  id: string;
  name: string;
  phone: string;
  totalOutstanding: number;
  creditLimit: number;
  overdueDays: number;
}

export function OutstandingWatchlist({
  onSendReminder,
  onRecordCredit,
}: OutstandingWatchlistProps) {
  const [customers, setCustomers] = useState<CustomerWatchItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/customers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.success && Array.isArray(data.customers) && data.customers.length > 0) {
          const withBalance = data.customers
            .filter((c: any) => Number(c.totalOutstanding) > 0)
            .sort((a: any, b: any) => Number(b.totalOutstanding) - Number(a.totalOutstanding))
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.mobile,
              totalOutstanding: Number(c.totalOutstanding),
              creditLimit: 100000,
              overdueDays: 0,
            }));

          if (withBalance.length > 0) {
            setCustomers(withBalance.slice(0, 5));
            return;
          }
        }

        // Fallback to sample watchlist
        setCustomers(
          SAMPLE_UDHAAR_CUSTOMERS.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            totalOutstanding: c.totalOutstanding,
            creditLimit: c.creditLimit,
            overdueDays: c.overdueDays,
          }))
        );
      })
      .catch(() => {
        if (!active) return;
        setCustomers(
          SAMPLE_UDHAAR_CUSTOMERS.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            totalOutstanding: c.totalOutstanding,
            creditLimit: c.creditLimit,
            overdueDays: c.overdueDays,
          }))
        );
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-4.5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00B887] border border-emerald-100 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              Outstanding Customers
            </h3>
            <p className="text-[10px] text-slate-400">
              Pending credit balance & reminders
            </p>
          </div>
        </div>

        <Link
          href="/customers?view=ledger"
          className="text-xs font-bold text-[#071F38] hover:text-[#00B887] flex items-center gap-1 transition-colors"
        >
          <span>Ledger</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {customers.map((cust) => (
          <div
            key={cust.id}
            className="p-3 rounded-lg border border-slate-200/80 bg-[#F6F9FC] hover:bg-white hover:border-[#00B887]/50 hover:shadow-2xs transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/customers/${cust.id}`}
                    className="font-bold text-xs text-[#071F38] hover:text-[#00B887] hover:underline truncate"
                  >
                    {cust.name}
                  </Link>
                  {cust.overdueDays > 0 ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                      {cust.overdueDays}d overdue
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                      Due
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {cust.phone}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-black text-[#071F38] tabular-nums block">
                  ₹{cust.totalOutstanding.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Udhaar due
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onSendReminder(cust)}
                className="px-2.5 py-1 text-white bg-[#00B887] hover:bg-[#009E74] rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Send WhatsApp Reminder"
              >
                <MessageSquare className="w-3 h-3 text-white" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => onRecordCredit(cust)}
                className="px-2.5 py-1 text-[#071F38] hover:text-black bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Record Payment"
              >
                <CreditCard className="w-3 h-3 text-slate-500" />
                <span>Collect</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
