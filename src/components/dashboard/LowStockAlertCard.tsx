'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Package, CheckCircle2 } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  currentStock: number;
  reorderLevel: number;
  unit: string;
}

export function LowStockAlertCard() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/inventory?lowStockOnly=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.success && Array.isArray(data.products)) {
          const low = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock: p.currentStock,
            reorderLevel: p.lowStockAlert ?? 10,
            unit: p.unit || 'Pcs',
          }));
          setItems(low.slice(0, 4));
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

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-4.5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              Low-Stock Warnings
            </h3>
            <p className="text-[10px] text-slate-400">
              Inventory near reorder threshold
            </p>
          </div>
        </div>

        <Link
          href="/inventory"
          className="text-xs font-bold text-[#071F38] hover:text-[#00B887] flex items-center gap-1 transition-colors"
        >
          <span>Catalog</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
          Checking stock levels...
        </div>
      ) : items.length === 0 ? (
        <div className="py-4 px-2 text-center flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00B887] flex items-center justify-center mb-1.5 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800">All products well-stocked</p>
          <p className="text-[10px] text-slate-400 mt-0.5">No immediate reorder alerts triggered</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 truncate block">
                  {item.name}
                </span>
                {item.sku && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    SKU: {item.sku}
                  </span>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] tabular-nums">
                  {item.currentStock} {item.unit} left
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Min: {item.reorderLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
