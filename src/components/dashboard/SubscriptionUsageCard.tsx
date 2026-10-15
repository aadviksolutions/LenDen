'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Crown, ArrowRight, Zap, Users, MessageSquare } from 'lucide-react';

interface SubscriptionData {
  subscription: {
    plan: string;
    status: string;
    trialDaysRemaining: number;
    monthlyPrice: number;
    maxMonthlyInvoices: number;
    maxStaffSeats: number;
    whatsAppQuota: number;
    endDate?: string;
  };
  usage: {
    monthlyInvoicesCreated: number;
    maxMonthlyInvoices: number;
    invoiceUsagePercent: number;
    activeStaffCount: number;
    maxStaffSeats: number;
  };
}

export function SubscriptionUsageCard() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/subscription')
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!active) return;
        if (resData?.subscription && resData?.usage) {
          setData(resData);
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-28 mb-3" />
        <div className="h-6 bg-slate-100 rounded w-full mb-2" />
        <div className="h-3 bg-slate-100 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const { subscription, usage } = data;
  const planName = subscription.plan.replace('_', ' ');
  const isTrial = subscription.status === 'TRIALING' || subscription.plan === 'FREE_TRIAL';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-4.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              {planName}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isTrial
                ? `${subscription.trialDaysRemaining} trial days remaining`
                : subscription.endDate
                ? `Renews on ${new Date(subscription.endDate).toLocaleDateString('en-IN')}`
                : 'SaaS Active Plan'}
            </p>
          </div>
        </div>

        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-[#00B887] border border-emerald-200 px-2 py-0.5 rounded">
          {subscription.status}
        </span>
      </div>

      {/* Usage Bars */}
      <div className="space-y-3 mb-3.5">
        {/* Monthly Invoices Limit */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
            <span className="text-slate-600 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#00B887]" />
              Monthly Bills
            </span>
            <span className="text-slate-900 font-bold tabular-nums">
              {usage.monthlyInvoicesCreated} / {usage.maxMonthlyInvoices} ({usage.invoiceUsagePercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#00B887] h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(5, usage.invoiceUsagePercent))}%` }}
            />
          </div>
        </div>

        {/* Staff Seats */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
            <span className="text-slate-600 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#071F38]" />
              Staff Seats
            </span>
            <span className="text-slate-900 font-bold tabular-nums">
              {usage.activeStaffCount} / {usage.maxStaffSeats} active
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#071F38] h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(10, Math.round((usage.activeStaffCount / usage.maxStaffSeats) * 100))
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Upgrade / Manage CTA */}
      <Link
        href="/subscription"
        className="w-full py-2 px-3 rounded-lg bg-[#F6F9FC] hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-[#071F38] hover:text-[#00B887] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>Manage Subscription</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
