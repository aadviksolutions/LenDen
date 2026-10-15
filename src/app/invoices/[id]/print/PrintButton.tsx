'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
    >
      <Printer className="w-3.5 h-3.5 text-emerald-400" />
      <span>Print / Save as PDF</span>
    </button>
  );
}
