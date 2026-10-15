'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

interface DayTrend {
  date: string;
  label: string;
  sales: number;
  collections: number;
}

interface MonthTrend {
  month: string;
  label: string;
  sales: number;
  collections: number;
}

export function SalesCollectionsChart() {
  const [viewMode, setViewMode] = useState<'7days' | '6months'>('7days');
  const [dailyData, setDailyData] = useState<DayTrend[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/reports/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!active) return;
        if (resData?.summary) {
          if (Array.isArray(resData.summary.trendDays)) {
            setDailyData(resData.summary.trendDays);
          }
          if (Array.isArray(resData.summary.monthlyTrend)) {
            setMonthlyData(resData.summary.monthlyTrend);
          }
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

  const currentItems = viewMode === '7days' ? dailyData : monthlyData;

  const totalSalesPeriod = currentItems.reduce((acc, it) => acc + it.sales, 0);
  const totalCollectionsPeriod = currentItems.reduce((acc, it) => acc + it.collections, 0);

  // Determine max value for chart scale
  const maxVal = Math.max(
    ...currentItems.flatMap((it) => [it.sales, it.collections]),
    10000 // minimum scale floor
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 mb-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              Sales & Collections Overview
            </h3>
            <span className="text-[10px] font-semibold text-[#00B887] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
              Live Flow
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Turnover vs Realized Cash & UPI receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs mr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#071F38]" />
              <span className="text-slate-600 text-[11px] font-medium">Billed Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00B887]" />
              <span className="text-slate-600 text-[11px] font-medium">Collected</span>
            </div>
          </div>

          {/* Range Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('7days')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                viewMode === '7days'
                  ? 'bg-white text-[#071F38] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setViewMode('6months')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                viewMode === '6months'
                  ? 'bg-white text-[#071F38] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Last 6 Months
            </button>
          </div>
        </div>
      </div>

      {/* Period Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 p-3 rounded-lg bg-[#F6F9FC] border border-slate-200/70">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Period Turnover
          </span>
          <span className="text-base sm:text-lg font-black text-[#071F38] tabular-nums">
            ₹{totalSalesPeriod.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Period Collections
          </span>
          <span className="text-base sm:text-lg font-black text-[#00B887] tabular-nums">
            ₹{totalCollectionsPeriod.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Recovery Rate
          </span>
          <span className="text-base sm:text-lg font-black text-[#008F91] tabular-nums">
            {totalSalesPeriod > 0
              ? `${Math.min(100, Math.round((totalCollectionsPeriod / totalSalesPeriod) * 100))}%`
              : '100%'}
          </span>
        </div>
      </div>

      {/* Bar Chart Container */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BarChart3 className="w-4 h-4 animate-bounce text-[#00B887]" />
            <span>Calculating metrics...</span>
          </div>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center p-4">
          <p className="text-xs font-semibold text-slate-700">No transactions recorded yet</p>
          <p className="text-[11px] text-slate-400 mt-1">Create your first bill to see live analytics</p>
        </div>
      ) : (
        <div className="relative pt-6 pb-2">
          {/* Chart Bars */}
          <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200">
            {currentItems.map((item, idx) => {
              const salesHeight = Math.max(4, Math.round((item.sales / maxVal) * 100));
              const collectionsHeight = Math.max(4, Math.round((item.collections / maxVal) * 100));
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 z-20 bg-[#071F38] text-white p-2 rounded-lg shadow-lg text-[10px] whitespace-nowrap pointer-events-none">
                      <p className="font-bold text-white mb-1 border-b border-white/20 pb-0.5">
                        {item.label}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-300">Sales:</span>
                        <span className="font-bold text-white">₹{item.sales.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-emerald-400">Collected:</span>
                        <span className="font-bold text-[#00B887]">
                          ₹{item.collections.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dual Bar Group */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                    {/* Sales Bar */}
                    <div
                      style={{ height: `${salesHeight}%` }}
                      className={`w-3 sm:w-5 rounded-t-sm bg-[#071F38] transition-all duration-300 ${
                        isHovered ? 'bg-[#0C2A4C] brightness-110' : ''
                      }`}
                    />
                    {/* Collections Bar */}
                    <div
                      style={{ height: `${collectionsHeight}%` }}
                      className={`w-3 sm:w-5 rounded-t-sm bg-[#00B887] transition-all duration-300 ${
                        isHovered ? 'bg-[#009E74] brightness-110' : ''
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X Axis Labels */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 mt-2">
            {currentItems.map((item, idx) => (
              <div key={idx} className="flex-1 text-center">
                <span className="text-[10px] font-semibold text-slate-500 truncate block">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
