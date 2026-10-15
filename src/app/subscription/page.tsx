'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  CreditCard,
  Clock,
  ArrowRight,
  RotateCcw,
  Users,
  Store,
  Layers,
} from 'lucide-react';
import {
  OFFICIAL_PLANS,
  BILLING_INTERVALS,
  BillingInterval,
  PlanKey,
  normalizePlanKey,
} from '@/lib/subscription/plans';

interface SubscriptionData {
  id: string;
  plan: 'FREE_TRIAL' | 'STARTER' | 'GROWTH_PRO' | 'ENTERPRISE';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED';
  monthlyPrice: number;
  maxMonthlyInvoices: number;
  maxStaffSeats: number;
  maxBranches: number;
  whatsAppQuota: number;
  trialDaysRemaining: number;
  endDate?: string | null;
}

interface UsageData {
  monthlyInvoicesCreated: number;
  maxMonthlyInvoices: number;
  invoiceUsagePercent: number;
  activeStaffCount: number;
  maxStaffSeats: number;
}

export default function SubscriptionPage() {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('YEARLY');

  const isDemo = Boolean(activeBusiness?.id?.startsWith('demo_') || (activeBusiness as any)?.isDemo);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscription');
      if (!res.ok) throw new Error('Failed to load subscription info');
      const data = await res.json();
      setSubscription(data.subscription);
      setUsage(data.usage);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error loading subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planKey: PlanKey) => {
    if (isDemo) {
      toast.info('This is a simulated demo workspace. Use the switcher in the top banner to test different plans.');
      return;
    }

    try {
      setSubscribing(true);
      const prismaPlan = OFFICIAL_PLANS[planKey].prismaEnum;
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: prismaPlan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription');

      toast.success(data.message || 'Subscription updated successfully!');
      fetchSubscription();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating plan');
    } finally {
      setSubscribing(false);
    }
  };

  const currentPlan = subscription?.plan || 'FREE_TRIAL';
  const activePlanKey: PlanKey = normalizePlanKey(currentPlan);
  const isTrial = subscription?.status === 'TRIALING' || currentPlan === 'FREE_TRIAL';

  return (
    <ModulePageShell
      title="My Business Subscription & Billing"
      description="Manage your subscription plan, examine limits, and evaluate Starter, Growth, and Scale entitlements."
      targetPhase="Subscription Management"
    >
      <div className="space-y-6">
        {/* Demo Mode Notice Banner if in Demo */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <strong>DEMO MODE WORKSPACE:</strong> You are testing the sample{' '}
                <span className="font-bold uppercase underline">{activePlanKey}</span> workspace. Real
                payment charges and real subscription updates are blocked.
              </div>
            </div>
            <Link
              href="/pricing"
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors shrink-0"
            >
              View Pricing Details
            </Link>
          </div>
        )}

        {/* Active Plan & Usage Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#071F38] text-white">
                <Sparkles className="w-5 h-5 text-[#00B887]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#071F38]">
                    Active Plan: {OFFICIAL_PLANS[activePlanKey]?.name || currentPlan.replace('_', ' ')}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      subscription?.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : subscription?.status === 'TRIALING'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {subscription?.status || 'TRIALING'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTrial
                    ? `14-Day Free Evaluation Period (${subscription?.trialDaysRemaining || 14} days remaining)`
                    : `Active subscription valid until ${
                        subscription?.endDate
                          ? new Date(subscription.endDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Renewal'
                      }`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#071F38]">
                ₹{OFFICIAL_PLANS[activePlanKey]?.pricing.MONTHLY.totalPrice || subscription?.monthlyPrice || 0}/mo
              </span>
              <p className="text-[11px] text-slate-400">Unlimited Invoices Included</p>
            </div>
          </div>

          {/* Usage Metrics */}
          {usage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">Monthly Invoices Generated</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {usage.monthlyInvoicesCreated} Created / UNLIMITED
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#00B887]" style={{ width: '100%' }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  Unlimited invoice generation on all official plans. No monthly cap.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Staff Seats Active</span>
                  <span className="text-lg font-black text-[#071F38] font-mono mt-1 block">
                    {usage.activeStaffCount} / {OFFICIAL_PLANS[activePlanKey]?.limits.maxUsers || 1}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {activePlanKey === 'STARTER' ? 'Owner only' : 'Owner & staff members'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                  <ShieldCheck className="w-6 h-6 text-[#00B887]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interval Selector */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <div>
            <h4 className="font-bold text-sm text-[#071F38]">Available Subscription Plans</h4>
            <p className="text-xs text-slate-500">Select a duration to see package totals and exact savings.</p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
            {BILLING_INTERVALS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setInterval(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  interval === item.key
                    ? 'bg-[#071F38] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['STARTER', 'GROWTH', 'SCALE'] as PlanKey[]).map((key) => {
            const plan = OFFICIAL_PLANS[key];
            const pricing = plan.pricing[interval];
            const isCurrent = activePlanKey === key;
            const isGrowth = key === 'GROWTH';

            return (
              <div
                key={key}
                className={`rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? 'bg-white border-2 border-[#071F38] shadow-md ring-2 ring-emerald-500/20'
                    : isGrowth
                    ? 'bg-white border-2 border-[#00B887] shadow-lg'
                    : 'bg-white text-slate-800 border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                {isGrowth && !isCurrent && (
                  <div className="absolute -top-3 right-5 bg-[#00B887] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    Recommended
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-5 bg-[#071F38] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    Active Plan
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#071F38]">
                      {plan.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {plan.limits.maxUsers === 1 ? '1 User' : `${plan.limits.maxUsers} Users`}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-black text-[#071F38]">
                      ₹{pricing.totalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      / {pricing.durationMonths === 1 ? 'mo' : `${pricing.durationMonths} mo`}
                    </span>
                  </div>

                  {/* Savings Pill */}
                  <div className="text-xs text-slate-600 mb-3 flex items-center gap-1.5 flex-wrap">
                    <span>Equiv: <strong>₹{pricing.monthlyEquivalent}/mo</strong></span>
                    {pricing.savingsAmount > 0 && (
                      <span className="bg-emerald-50 text-[#00B887] text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                        Save ₹{pricing.savingsAmount}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-4 min-h-[32px]">
                    {plan.tagline}
                  </p>

                  <div className="space-y-2 border-t pt-4 text-xs font-medium border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                      <span>Unlimited Invoices</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Max Users: {plan.limits.maxUsers}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Locations: {plan.limits.maxLocations}</span>
                    </div>
                    {plan.features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-600">
                        <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleUpgrade(key)}
                    disabled={subscribing || isCurrent}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : isGrowth
                        ? 'bg-[#00B887] hover:bg-[#009E74] text-white shadow-2xs'
                        : 'bg-[#071F38] hover:bg-[#0D2C4D] text-white shadow-2xs'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : `Select ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Link */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#008F91] hover:text-[#00B887] transition-colors"
          >
            <span>Need a full side-by-side feature matrix comparison? View Pricing Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </ModulePageShell>
  );
}
