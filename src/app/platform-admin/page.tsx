'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import {
  ShieldAlert,
  Building2,
  CreditCard,
  Users,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PlatformMetrics {
  monthlyRecurringRevenue: string;
  mrrNumeric: number;
  totalBusinesses: number;
  activeWorkspaces: number;
  trialWorkspaces: number;
  suspendedWorkspaces: number;
  totalMonthlyInvoicesProcessed: number;
  totalPlatformUsers: number;
  platformUptime: string;
}

interface TenantBusiness {
  id: string;
  businessName: string;
  legalName: string;
  tradeType: string;
  gstin: string;
  state: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: string;
  subscriptionStatus: string;
  monthlyPrice: number;
  trialDaysRemaining: number;
  invoiceCount: number;
  customerCount: number;
  itemCount: number;
  createdAt: string;
}

export default function PlatformAdminOverviewPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [businesses, setBusinesses] = useState<TenantBusiness[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/metrics');
      if (!res.ok) throw new Error('Failed to load platform metrics');
      const data = await res.json();
      setMetrics(data.metrics);
      setBusinesses(data.businesses || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching platform metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (businessId: string, currentStatus: string, businessName: string) => {
    const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      setActionId(businessId);
      const res = await fetch(`/api/platform-admin/tenants/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tenant status');

      toast.success(`${businessName} is now ${newStatus}`);
      fetchMetrics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setActionId(null);
    }
  };

  return (
    <ModulePageShell
      title="Platform Administration Overview"
      badgeText="Super Admin Scope"
      description="Global multi-tenant platform oversight for the Lenden platform owner & developers. Monitor paying client workspaces, SaaS subscription revenue, plan allocations, and system health."
      targetPhase="Platform Operations"
    >
      <div className="space-y-6">
        {/* Security & Architectural Boundary Notice */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-800 text-white shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-purple-300">
              Architecture Rule: Platform Owner vs. Business Workspace
            </span>
          </div>
          <p className="text-xs text-purple-100/90 leading-relaxed">
            This module is strictly isolated to <strong>SUPER_ADMIN</strong> platform developers/owners. Unlike business users who are siloed strictly to their own workspace data, the Platform Admin Panel provides cross-tenant subscription management, client account controls, and plan configuration.
          </p>
        </div>

        {/* Global Platform KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold">Monthly Recurring Revenue</span>
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {metrics?.monthlyRecurringRevenue || '₹0'}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <span>{metrics?.activeWorkspaces || 0} active subscriptions</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold">Total Client Workspaces</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {metrics?.totalBusinesses || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <span>
                {metrics?.trialWorkspaces || 0} in trial • {metrics?.suspendedWorkspaces || 0} suspended
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold">Invoices Processed</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {(metrics?.totalMonthlyInvoicesProcessed || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <span>Across all business tenants this month</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold">Platform Availability</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight text-emerald-600">
              {metrics?.platformUptime || '99.98%'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <span>Zero critical incidents in 30 days</span>
            </div>
          </div>
        </div>

        {/* Tenant Business Accounts Table Preview */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-slate-900 block">
                Tenant Workspaces & Live Subscription Status
              </span>
              <span className="text-xs text-slate-500">
                Registered tenants and multi-tenant isolation status
              </span>
            </div>
            <Link
              href="/platform-admin/businesses"
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 hover:underline"
            >
              Manage all client accounts ({businesses.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Business Workspace</th>
                  <th className="py-3 px-4">Owner Contact</th>
                  <th className="py-3 px-4">Assigned Plan</th>
                  <th className="py-3 px-4">Subscription Status</th>
                  <th className="py-3 px-4">Invoices Created</th>
                  <th className="py-3 px-4 text-right">Quick Super Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading platform tenant roster...
                    </td>
                  </tr>
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No business accounts found.
                    </td>
                  </tr>
                ) : (
                  businesses.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{b.businessName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {b.tradeType} • {b.state}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{b.ownerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{b.ownerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {b.plan.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        {b.subscriptionStatus === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ACTIVE
                          </span>
                        )}
                        {b.subscriptionStatus === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            SUSPENDED
                          </span>
                        )}
                        {b.subscriptionStatus === 'TRIALING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-amber-600" />
                            TRIALING ({b.trialDaysRemaining}d)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {b.invoiceCount} invoices
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(b.id, b.subscriptionStatus, b.businessName)}
                            disabled={actionId === b.id}
                            className={`px-3 py-1 text-[11px] font-semibold rounded border transition-colors ${
                              b.subscriptionStatus === 'SUSPENDED'
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {actionId === b.id
                              ? 'Updating...'
                              : b.subscriptionStatus === 'SUSPENDED'
                              ? 'Activate'
                              : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links to other Platform Admin modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/platform-admin/plans"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-xs text-slate-900 group-hover:text-purple-700 transition-colors block">
                Subscription Plan Limits & Feature Matrix
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure counters, branches, staff seats, and GST e-invoicing entitlements.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 ml-3" />
          </Link>

          <Link
            href="/platform-admin/settings"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-xs text-slate-900 group-hover:text-purple-700 transition-colors block">
                Platform Security & Global Environment Settings
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage payment gateway keys, NIC e-invoicing API secrets & audit log policies.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 ml-3" />
          </Link>
        </div>
      </div>
    </ModulePageShell>
  );
}
