'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Receipt,
  Plus,
  Trash2,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  Building,
  CreditCard,
  Percent,
  X,
  CheckCircle2,
} from 'lucide-react';
import { calculateInvoiceTotals, LineItemInput, GstType } from '@/lib/billing/calculator';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface CustomerOption {
  id: string;
  name: string;
  mobile: string;
  gstin: string | null;
  billingAddress: string | null;
}

const COMMON_GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Pcs', 'Bags', 'Kg', 'Boxes', 'Nos', 'Mtr', 'Ltr', 'Hours', 'Set', 'Packet'];

function InvoiceCreationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';

  const { activeBusiness } = useAuth();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  }, []);

  const [gstType, setGstType] = useState<GstType>('CGST_SGST');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [isGstInvoice, setIsGstInvoice] = useState(true);

  // Line items state
  const [items, setItems] = useState<LineItemInput[]>([
    {
      description: '',
      quantity: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      discountType: 'AMOUNT',
      taxRate: 18,
    },
  ]);

  // Payment on creation
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. charged after due date.\n3. Subject to local jurisdiction.'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Add Customer Modal
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // Load customer and product lists
  useEffect(() => {
    fetch('/api/customers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setCustomers(data.customers);
          if (!selectedCustomerId && data.customers.length > 0) {
            setSelectedCustomerId(data.customers[0].id);
          }
        }
      })
      .catch(() => {});

    fetch('/api/inventory')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setCatalogProducts(data.products || []);
        }
      })
      .catch(() => {});
  }, [selectedCustomerId]);

  // Real-time calculation preview
  const calc = calculateInvoiceTotals({
    items,
    gstType,
    isTaxInclusive,
    isGstInvoice,
    paidAmount: parseFloat(paidAmount) || 0,
    enableRounding: true,
  });

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'Pcs',
        rate: 0,
        discount: 0,
        discountType: 'AMOUNT',
        taxRate: isGstInvoice ? 18 : 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemInput, val: unknown) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = catalogProducts.find((p) => p.id === productId);
    setItems((prev) => {
      const copy = [...prev];
      if (prod) {
        copy[index] = {
          productId: prod.id,
          description: prod.name,
          quantity: copy[index].quantity || 1,
          unit: prod.unit || 'Pcs',
          rate: prod.sellingPrice || 0,
          discount: copy[index].discount || 0,
          discountType: copy[index].discountType || 'AMOUNT',
          taxRate: isGstInvoice ? (prod.taxRate ?? 18) : 0,
        };
      } else {
        copy[index] = {
          ...copy[index],
          productId: undefined,
        };
      }
      return copy;
    });
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustName,
          mobile: newCustMobile,
          gstin: newCustGstin,
          billingAddress: newCustAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add customer');
      }

      setCustomers((prev) => [data.customer, ...prev]);
      setSelectedCustomerId(data.customer.id);
      setAddCustomerOpen(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustGstin('');
      setNewCustAddress('');
      toast.success(`Customer ${data.customer.name} added successfully!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select or add a customer.');
      toast.error('Please select or add a customer.');
      return;
    }

    const validItems = items.filter((i) => i.description.trim() && i.rate > 0);
    if (validItems.length === 0) {
      setError('Please add at least one line item with a description and unit rate.');
      toast.error('Please add at least one line item with description and rate.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          invoiceDate,
          dueDate,
          gstType,
          isTaxInclusive,
          isGstInvoice,
          items: validItems,
          paidAmount: parseFloat(paidAmount) || 0,
          paymentMethod,
          paymentReference,
          notes,
          termsAndConditions: terms,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate invoice.');
      }

      toast.success(`Invoice ${data.invoice.invoiceNumber} created!`);
      // Redirect to invoice details view
      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while creating invoice.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create New Tax Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Workspace: <strong>{activeBusiness?.name || 'Sharma Traders'}</strong> • GSTIN:{' '}
              <span className="font-mono text-slate-700">{activeBusiness?.gstin || 'Unregistered'}</span>
            </p>
          </div>
        </div>

        {/* Running total pill in top right */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold shadow-2xs">
          <span className="text-slate-300 font-sans text-[11px] font-normal">Running Total:</span>
          <span className="text-emerald-400">₹{calc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Step 1: Customer Selection & Tax Configuration */}
        <div className="bg-white p-4.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              1. Customer & Bill Profile
            </span>

            <button
              type="button"
              onClick={() => setAddCustomerOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Quick Add Customer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Customer / Party *
              </label>
              {customers.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="text-slate-400">No customers found.</span>
                  <button
                    type="button"
                    onClick={() => setAddCustomerOpen(true)}
                    className="text-emerald-700 font-semibold underline"
                  >
                    Create One
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile}) {c.gstin ? `[GST: ${c.gstin}]` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedCustomer && (
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Phone: {selectedCustomer.mobile}
                  {selectedCustomer.gstin && ` • GSTIN: ${selectedCustomer.gstin}`}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Tax Regime & Inclusive toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax Regime</label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value as GstType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="CGST_SGST">Intra-State (CGST + SGST)</option>
                <option value="IGST">Inter-State (IGST)</option>
                <option value="EXEMPT">Exempt / Non-GST</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Price Calculation</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="taxInclusive"
                    checked={!isTaxInclusive}
                    onChange={() => setIsTaxInclusive(false)}
                    className="accent-slate-900"
                  />
                  <span>Tax Exclusive (Base + GST)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="taxInclusive"
                    checked={isTaxInclusive}
                    onChange={() => setIsTaxInclusive(true)}
                    className="accent-slate-900"
                  />
                  <span>Tax Inclusive</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Standard</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isGstCheckbox"
                  checked={isGstInvoice}
                  onChange={(e) => setIsGstInvoice(e.target.checked)}
                  className="rounded accent-slate-900"
                />
                <label htmlFor="isGstCheckbox" className="cursor-pointer text-slate-700">
                  Generate Formal GST Tax Invoice
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Line Items Dynamic Table */}
        <div className="bg-white p-4.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              2. Items & Pricing
            </span>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:text-white bg-slate-100 hover:bg-slate-900 border border-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-2">Item Description / Product *</th>
                  <th className="py-2 px-2 w-20">Qty</th>
                  <th className="py-2 px-2 w-24">Unit</th>
                  <th className="py-2 px-2 w-28">Rate (₹)</th>
                  <th className="py-2 px-2 w-24">Disc (₹)</th>
                  {isGstInvoice && <th className="py-2 px-2 w-24">GST %</th>}
                  <th className="py-2 px-2 w-32 text-right">Line Total (₹)</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineCalc = calc.items[index];
                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2">
                        {catalogProducts.length > 0 && (
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="w-full mb-1 text-[11px] px-2 py-1 border border-slate-200 rounded-md bg-slate-50 text-slate-700"
                          >
                            <option value="">-- Choose from Catalog --</option>
                            {catalogProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku || 'No SKU'}) • ₹{p.sellingPrice} • Stock: {p.currentStock} {p.unit}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          required
                          placeholder="Item name or service description..."
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      {isGstInvoice && (
                        <td className="py-2 px-2">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-mono"
                          >
                            {COMMON_GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>
                      )}

                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                        ₹{lineCalc?.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 3: Payment, Notes & Calculation Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes & Payment Recording (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Payment at time of creation */}
            <div className="bg-white p-4.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                3. Payment Collection (Settlement / Udhaar)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex gap-2 mt-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPaidAmount('0')}
                      className="text-slate-500 hover:text-slate-800 underline"
                    >
                      Credit (₹0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(calc.total.toFixed(2))}
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      Full Pay (₹{calc.total.toFixed(2)})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    placeholder="Ref / Transaction ID"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="bg-white p-4.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Notes</label>
                <textarea
                  rows={2}
                  placeholder="Delivery remarks or special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Running Summary Calculation (Sticky) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 h-fit sticky top-20">
            <div className="space-y-2.5 text-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block pb-2 border-b border-slate-100">
                Summary & Totals
              </span>

              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-medium tabular-nums">₹{calc.subtotal.toFixed(2)}</span>
              </div>

              {calc.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-mono tabular-nums">-₹{calc.discountTotal.toFixed(2)}</span>
                </div>
              )}

              {isGstInvoice && calc.taxTotal > 0 && (
                <>
                  {gstType === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>CGST:</span>
                        <span className="font-mono tabular-nums">₹{calc.cgstTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>SGST:</span>
                        <span className="font-mono tabular-nums">₹{calc.sgstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>IGST:</span>
                      <span className="font-mono tabular-nums">₹{calc.igstTotal.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {calc.rounding !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Rounding:</span>
                  <span className="font-mono tabular-nums">
                    {calc.rounding > 0 ? `+₹${calc.rounding.toFixed(2)}` : `-₹${Math.abs(calc.rounding).toFixed(2)}`}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono text-base tabular-nums">₹{calc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                <span>Paid Now:</span>
                <span className="font-mono tabular-nums">₹{calc.paidAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-amber-900 font-bold bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 mt-1">
                <span>Balance (Udhaar):</span>
                <span className="font-mono tabular-nums">₹{calc.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>Save & Generate Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {addCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Add Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party / Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahavir Hardware Store"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9827123456"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="City, State, Pincode..."
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddCustomerOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {addingCustomer ? 'Adding...' : 'Add & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading invoice generator...</div>}>
      <InvoiceCreationForm />
    </Suspense>
  );
}
