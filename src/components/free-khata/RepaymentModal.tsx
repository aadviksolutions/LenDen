'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  AlertCircle,
  Check,
  FileText,
} from 'lucide-react';

export interface RepaymentTransactionTarget {
  id: string;
  contactName: string;
  type: 'GAVE' | 'RECEIVED';
  amount: number;
  balanceAmount: number;
  settledAmount: number;
  date: string | Date;
}

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: RepaymentTransactionTarget | null;
}

export function RepaymentModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: RepaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      setAmount(transaction.balanceAmount.toString());
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('CASH');
      setNotes('');
      setError(null);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isGave = transaction.type === 'GAVE';

  const handleSetFull = () => {
    setAmount(transaction.balanceAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (parsedAmount > transaction.balanceAmount) {
      setError(
        `Repayment amount cannot exceed the remaining balance of ₹${transaction.balanceAmount}.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/free-khata/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          amount: parsedAmount,
          date: new Date(date).toISOString(),
          paymentMode,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record repayment');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="p-5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#008F91] bg-white px-2 py-0.5 rounded border border-emerald-200">
              Record Repayment
            </span>
            <h3 className="text-base font-black text-[#071F38] mt-1">
              {isGave
                ? `Payment Returned by ${transaction.contactName}`
                : `Repaying to ${transaction.contactName}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="px-5 pt-4 pb-1">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10.5px]">Original Entry</span>
              <strong className="text-slate-800">
                ₹{transaction.amount.toLocaleString('en-IN')}
              </strong>
              <span className="text-slate-400 ml-1">
                ({isGave ? 'You Gave' : 'You Received'})
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10.5px]">Remaining Balance</span>
              <span className="font-black text-sm text-[#00B887]">
                ₹{transaction.balanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Repayment Amount (₹) *
              </label>
              <button
                type="button"
                onClick={handleSetFull}
                className="text-[11px] font-bold text-[#008F91] hover:underline cursor-pointer"
              >
                Full Amount (₹{transaction.balanceAmount})
              </button>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center font-bold text-lg text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={transaction.balanceAmount}
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full pl-9 pr-4 py-3 text-xl font-black rounded-2xl border border-emerald-200 text-emerald-800 bg-emerald-50/20 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887] transition-all"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Cash' },
                { id: 'UPI', label: 'UPI / GPay' },
                { id: 'BANK_TRANSFER', label: 'Bank' },
                { id: 'CHEQUE', label: 'Cheque' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id as any)}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMode === m.id
                      ? 'bg-[#071F38] text-white border-[#071F38] shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Repayment Date *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid in cash, via phonepe..."
                className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B887] hover:bg-[#009E74] shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Repayment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
