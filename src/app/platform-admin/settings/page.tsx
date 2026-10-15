'use client';

import React from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import {
  Lock,
  Key,
  Server,
} from 'lucide-react';
import { useActionModal } from '@/context/ActionModalContext';

export default function PlatformSettingsPage() {
  const { openAction } = useActionModal();

  return (
    <ModulePageShell
      title="Global Platform Settings & Security Policies"
      badgeText="Super Admin Control"
      description="Configure platform-wide environment settings, public registration controls, payment gateway keys, GST portal integration credentials, and system audit policies."
      targetPhase="Platform Admin Scope"
      actionButtonText="Save Platform Config Mock"
      actionButtonType="admin_save_settings"
    >
      <div className="space-y-6">
        {/* Security Baseline Box */}
        <div className="p-4 rounded-2xl bg-purple-950 border border-purple-800 text-white shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-purple-300">
              Future Security Architecture Enforcement
            </span>
          </div>
          <p className="text-xs text-purple-100/90 leading-relaxed">
            These settings govern the entire SaaS application. Public registration is strictly restricted to provisioning new <strong>BUSINESS_OWNER</strong> client tenants in trial mode. Creation of <strong>SUPER_ADMIN</strong> platform accounts is prohibited via public registration routes and can only occur through secured CLI commands or platform database seeds.
          </p>
        </div>

        {/* Global Platform Configuration Sections */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-700" />
              Platform Registration & Workspace Provisioning
            </h3>
            <p className="text-xs text-slate-500">
              Control how new clients sign up and get onboarded to the SaaS platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-semibold text-slate-800 block mb-1">
                Public Self-Serve Client Registration
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Allow business owners to register accounts and start a 14-day trial.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ENABLED (PROVISIONS BUSINESS_OWNER ONLY)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-semibold text-slate-800 block mb-1">
                Super Admin Creation Pathway
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Restricted to direct CLI seeds and platform owner root invites.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                PUBLIC REGISTRATION FORBIDDEN
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-semibold text-slate-800 block mb-1">
                Trial Duration for New Tenants
              </label>
              <input
                type="text"
                defaultValue="14 Days (Growth Pro Tier Demo)"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                readOnly
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-semibold text-slate-800 block mb-1">
                Data Isolation Enforcement Mode
              </label>
              <input
                type="text"
                defaultValue="Strict Tenant Scoping (Mandatory business_id on all queries)"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono text-emerald-800"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Payment & Integration Gateway Credentials */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-700" />
              Global Integrations & Third-Party API Keys
            </h3>
            <p className="text-xs text-slate-500">
              Platform-level API credentials used to orchestrate billing, tax e-invoicing, and WhatsApp delivery
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">Razorpay / Stripe Gateway Key ID</label>
              <input
                type="text"
                defaultValue="rzp_live_••••••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono"
                readOnly
              />
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">NIC GST e-Invoicing GSP Client ID</label>
              <input
                type="text"
                defaultValue="gsp_prod_nic_••••••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono"
                readOnly
              />
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">Meta WhatsApp Cloud API System Token</label>
              <input
                type="text"
                defaultValue="EAAB••••••••••••••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono"
                readOnly
              />
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">Global Audit Log Retention Policy</label>
              <input
                type="text"
                defaultValue="365 Days (Compliant with Indian Commercial Tax Audit Rules)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                readOnly
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Only accessible by authorized <strong>SUPER_ADMIN</strong> sessions.
            </span>
            <button
              onClick={() => openAction('admin_save_settings')}
              className="px-4 py-2 bg-purple-950 hover:bg-purple-900 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Update Platform Settings Mock
            </button>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
