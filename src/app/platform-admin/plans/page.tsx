'use client';

import React from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { SAMPLE_PLAN_CONFIGS } from '@/data/mockData';
import {
  Check,
  X as CloseIcon,
  ShieldAlert,
  Edit3,
} from 'lucide-react';
import { useActionModal } from '@/context/ActionModalContext';

export default function PlatformPlansConfigPage() {
  const { openAction } = useActionModal();

  return (
    <ModulePageShell
      title="Subscription Plans & Feature Limits"
      badgeText="Super Admin Control"
      description="Configure commercial subscription tiers: adjust monthly/annual pricing, enforce invoice limits, counter quotas, staff seats, and GST e-invoicing entitlements."
      targetPhase="Platform Admin Scope"
      actionButtonText="+ Create New Tier"
      actionButtonType="admin_create_plan"
    >
      <div className="space-y-6">
        {/* Architecture Note */}
        <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-950 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-900 block">
              Feature Gating & Plan Quotas Architecture:
            </span>
            <span>
              Plan quotas defined here are enforced on every server-side transaction and API endpoint (e.g. invoice creation, counter provisioning, staff invitations). Client workspaces cannot exceed their assigned plan limits without an upgrade or Super Admin adjustment.
            </span>
          </div>
        </div>

        {/* Plan Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SAMPLE_PLAN_CONFIGS.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-purple-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-slate-900">{plan.name}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Tier
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-2xl font-black text-slate-900">₹{plan.monthlyPrice}</span>
                  <span className="text-xs text-slate-500">/mo (₹{plan.annualPrice}/yr)</span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-700">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Monthly Invoices:</span>
                    <strong className="font-mono text-slate-900">
                      {plan.maxMonthlyInvoices === 'UNLIMITED' ? 'Unlimited' : `${plan.maxMonthlyInvoices} bills`}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Billing Counters / POS:</span>
                    <strong className="font-mono text-slate-900">{plan.maxCounters} Counter{plan.maxCounters > 1 ? 's' : ''}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Branches / Warehouses:</span>
                    <strong className="font-mono text-slate-900">{plan.maxBranches} Branch{plan.maxBranches > 1 ? 'es' : ''}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Staff Seats (RBAC):</span>
                    <strong className="font-mono text-slate-900">{plan.maxStaffSeats} Seats</strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">WhatsApp Reminder SMS:</span>
                    <strong className="font-mono text-slate-900">{plan.whatsAppQuotaMonthly.toLocaleString('en-IN')}/mo</strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">GST e-Invoicing (NIC API):</span>
                    {plan.gstEInvoicingEnabled ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Enabled
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <CloseIcon className="w-3.5 h-3.5" /> Excluded
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Barcode Inventory Scanning:</span>
                    {plan.inventoryBarcodeEnabled ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Enabled
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <CloseIcon className="w-3.5 h-3.5" /> Excluded
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  openAction('admin_edit_plan', {
                    name: plan.name,
                    price: plan.monthlyPrice,
                  })
                }
                className="mt-6 w-full py-2 bg-slate-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Configure Limits & Pricing
              </button>
            </div>
          ))}
        </div>
      </div>
    </ModulePageShell>
  );
}
