'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Phone,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';

export interface ContactOption {
  id: string;
  name: string;
  phone?: string | null;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'GAVE' | 'RECEIVED';
  preselectedContact?: ContactOption | null;
  existingContacts?: ContactOption[];
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'GAVE',
  preselectedContact = null,
  existingContacts = [],
}: TransactionModalProps) {
  const [type, setType] = useState<'GAVE' | 'RECEIVED'>(defaultType);
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setError(null);
      setAmount('');
      setDescription('');
      setDueDate('');
      setDate(new Date().toISOString().split('T')[0]);

      if (preselectedContact) {
        setSelectedContactId(preselectedContact.id);
        setPersonName(preselectedContact.name);
        setPhone(preselectedContact.phone || '');
      } else {
        setSelectedContactId('');
        setPersonName('');
        setPhone('');
      }
    }
  }, [isOpen, defaultType, preselectedContact]);

  if (!isOpen) return null;

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    if (contactId === 'NEW') {
      setPersonName('');
      setPhone('');
    } else {
      const found = existingContacts.find((c) => c.id === contactId);
      if (found) {
        setPersonName(found.name);
        setPhone(found.phone || '');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!selectedContactId && (!personName || personName.trim().length < 2)) {
      setError("Please enter the person's name (at least 2 characters).");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        type,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        description: description.trim() || null,
      };

      if (selectedContactId && selectedContactId !== 'NEW') {
        payload.contactId = selectedContactId;
        if (phone.trim()) payload.phone = phone.trim();
      } else {
        payload.personName = personName.trim();
        payload.phone = phone.trim() || null;
      }

      const res = await fetch('/api/free-khata/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isGave = type === 'GAVE';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header with Type Selector */}
        <div className={`p-5 ${isGave ? 'bg-rose-50/80 border-b border-rose-100' : 'bg-emerald-50/80 border-b border-emerald-100'}`}>
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              New Personal Khata Entry
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Buttons: I Gave vs I Received */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setType('GAVE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isGave
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>I Gave (Maine Diye)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('RECEIVED')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                !isGave
                  ? 'bg-[#00B887] text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>I Received (Maine Liye)</span>
            </button>
          </div>

          <div className="text-center mt-2.5">
            <p className="text-[11px] font-medium text-slate-600">
              {isGave
                ? 'Record money you lent out • You will collect this amount'
                : 'Record money you borrowed • You will repay this amount'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input with Large Rupees Display */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center font-bold text-lg text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`block w-full pl-9 pr-4 py-3 text-xl font-black rounded-2xl border ${
                  isGave
                    ? 'border-rose-200 text-rose-700 focus:ring-rose-500/30 focus:border-rose-500'
                    : 'border-emerald-200 text-emerald-800 focus:ring-emerald-500/30 focus:border-[#00B887]'
                } bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all`}
              />
            </div>
          </div>

          {/* Person Selection or Name */}
          {!preselectedContact && existingContacts.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Person / Contact
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => handleContactSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
              >
                <option value="">-- Choose Existing Contact or Add New --</option>
                {existingContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
                <option value="NEW">+ Add New Person</option>
              </select>
            </div>
          )}

          {/* Name & Phone Inputs if adding new or no contact preselected */}
          {(!selectedContactId || selectedContactId === 'NEW') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Person's Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preselected Contact Display */}
          {preselectedContact && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#071F38]">{preselectedContact.name}</span>
                {preselectedContact.phone && (
                  <span className="text-slate-500 ml-2">({preselectedContact.phone})</span>
                )}
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Selected
              </span>
            </div>
          )}

          {/* Date & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Transaction Date *
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expected Due Date <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
                />
              </div>
            </div>
          </div>

          {/* Description / Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note / Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Urgent loan for festival, or personal help..."
                className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                isGave
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-[#00B887] hover:bg-[#009E74] shadow-emerald-600/20'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isGave ? 'Record I Gave' : 'Record I Received'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
