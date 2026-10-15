'use client';

import React, { useState, useEffect } from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ShieldCheck,
  RefreshCw,
  PowerOff,
  PlusCircle,
  X,
  CreditCard,
} from 'lucide-react';

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

export default function BusinessAccountsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<TenantBusiness[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal for plan change or trial extension
  const [selectedTenant, setSelectedTenant] = useState<TenantBusiness | null>(null);
  const [modalType, setModalType] = useState<'PLAN' | 'EXTEND' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('GROWTH_PRO');
  const [extensionDays, setExtensionDays] = useState('14');
  const [submittingModal, setSubmittingModal] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/metrics');
      if (!res.ok) throw new Error('Failed to load businesses');
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching tenants');
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
      fetchBusinesses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setActionId(null);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      setSubmittingModal(true);
      const payload: any = {};
      if (modalType === 'PLAN') {
        payload.plan = selectedPlan;
        payload.status = 'ACTIVE';
      } else if (modalType === 'EXTEND') {
        payload.trialDaysExtension = parseInt(extensionDays, 10);
      }

      const res = await fetch(`/api/platform-admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tenant');

      toast.success('Tenant settings updated successfully!');
      setSelectedTenant(null);
      setModalType(null);
      fetchBusinesses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating tenant');
    } finally {
      setSubmittingModal(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    if (filter !== 'ALL' && b.subscriptionStatus !== filter) return false;
    if (
      searchQuery &&
      !b.businessName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <ModulePageShell
      title="Client Business Accounts & Workspaces"
      badgeText="Super Admin Control"
      description="Manage registered paying business client accounts: view tenant workspaces, activate or suspend accounts, grant grace periods, and review plan assignments."
      targetPhase="Platform Control"
    >
      <div className="space-y-4">
        {/* Architecture Isolation Note */}
        <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-900 block">
              Multi-Tenant Isolation & Account Governance:
            </span>
            <span>
              Each client listed below operates in an isolated workspace with strict tenant separation (`business_id`). Business users never have access to this directory or to records belonging to other businesses.
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search business name, owner, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Status:</span>
            {['ALL', 'ACTIVE', 'TRIALING', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filter === st
                    ? 'bg-purple-950 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Business Accounts Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Business / Legal Entity</th>
                  <th className="py-3 px-4">Owner & Contact</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Subscription Status</th>
                  <th className="py-3 px-4">Invoices / Customers</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading business directories...
                    </td>
                  </tr>
                ) : filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No business accounts match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.businessName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {b.tradeType} • {b.state}
                        </div>
                        {b.gstin && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            GSTIN: {b.gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.ownerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{b.ownerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div>{b.plan.replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-400 font-mono">₹{b.monthlyPrice}/mo</div>
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
                            TRIAL ({b.trialDaysRemaining}d)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div>{b.invoiceCount} invoices</div>
                        <div className="text-[10px] text-slate-400">{b.customerCount} customers</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTenant(b);
                              setSelectedPlan(b.plan);
                              setModalType('PLAN');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                          >
                            Plan
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTenant(b);
                              setModalType('EXTEND');
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                            title="Extend trial days"
                          >
                            +Days
                          </button>
                          <button
                            onClick={() => handleToggleStatus(b.id, b.subscriptionStatus, b.businessName)}
                            disabled={actionId === b.id}
                            className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                              b.subscriptionStatus === 'SUSPENDED'
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {actionId === b.id
                              ? '...'
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
      </div>

      {/* Modal for Plan Change or Trial Extension */}
      {selectedTenant && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {modalType === 'PLAN' ? 'Change Subscription Plan' : 'Extend Trial Period'}
              </h3>
              <button
                onClick={() => {
                  setSelectedTenant(null);
                  setModalType(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Target Business:{' '}
                <strong className="text-slate-900">{selectedTenant.businessName}</strong>
              </p>

              {modalType === 'PLAN' ? (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select New Tier</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-700"
                  >
                    <option value="STARTER">Starter Plan (₹499/mo, 500 invoices)</option>
                    <option value="GROWTH_PRO">Growth Pro (₹999/mo, 2500 invoices)</option>
                    <option value="ENTERPRISE">Enterprise Multi-Branch (₹2499/mo, 10000 invoices)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Additional Days to Add
                  </label>
                  <select
                    value={extensionDays}
                    onChange={(e) => setExtensionDays(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-700"
                  >
                    <option value="7">+7 Days Grace</option>
                    <option value="14">+14 Days Extension</option>
                    <option value="30">+30 Days Free Trial</option>
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTenant(null);
                    setModalType(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-purple-950 text-white rounded-xl font-semibold hover:bg-purple-900 disabled:opacity-50"
                >
                  {submittingModal ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
