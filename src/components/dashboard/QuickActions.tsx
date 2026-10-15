'use client';

import React from 'react';
import {
  FilePlus2,
  CreditCard,
  UserPlus,
  PackagePlus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface QuickActionsProps {
  onTriggerAction: (actionType: string) => void;
}

export function QuickActions({ onTriggerAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'new_invoice',
      label: 'New Bill',
      subtitle: 'Create GST invoice',
      icon: FilePlus2,
      primary: true,
    },
    {
      id: 'add_customer',
      label: 'Add Customer',
      subtitle: 'New ledger profile',
      icon: UserPlus,
      primary: false,
    },
    {
      id: 'record_udhaar',
      label: 'Record Payment',
      subtitle: 'Cash / UPI settlement',
      icon: CreditCard,
      primary: false,
    },
    {
      id: 'new_item',
      label: 'Add Product',
      subtitle: 'Stock & inventory item',
      icon: PackagePlus,
      primary: false,
    },
    {
      id: 'whatsapp_reminder',
      label: 'Send Reminders',
      subtitle: 'Udhaar collection link',
      icon: MessageSquare,
      primary: false,
    },
  ];

  return (
    <div className="mb-6 bg-white rounded-xl p-3.5 sm:p-4.5 border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#00B887]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#071F38]">
            Quick Actions
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Instant operations
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => onTriggerAction(act.id)}
              className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg border text-left transition-all group cursor-pointer ${
                act.primary
                  ? 'bg-[#071F38] border-[#071F38] text-white hover:bg-[#0C2A4C] shadow-2xs'
                  : 'bg-white border-slate-200/90 text-slate-800 hover:border-[#00B887] hover:shadow-2xs'
              }`}
            >
              <div
                className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  act.primary
                    ? 'bg-white/10 text-[#00B887]'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 group-hover:text-[#00B887] group-hover:border-[#00B887]/30'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block leading-tight truncate">
                  {act.label}
                </span>
                <span
                  className={`text-[10px] block mt-0.5 truncate ${
                    act.primary ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {act.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
