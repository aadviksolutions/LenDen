'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Send,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'INVOICE' | 'RECEIPT' | 'STATEMENT';
  shareType?: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | string;
  invoiceId?: string;
  paymentId?: string;
  customerId?: string;
  defaultPhone?: string;
  defaultName?: string;
  customerName?: string;
  customerPhone?: string;
  invoiceNumber?: string;
  invoiceTotal?: number;
  balanceDue?: number;
  dueDate?: string;
  amount?: number;
  documentTitle?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  type,
  shareType,
  invoiceId,
  paymentId,
  customerId,
  defaultPhone = '',
  defaultName = '',
  customerName,
  customerPhone,
  invoiceNumber,
  invoiceTotal,
  balanceDue,
  dueDate,
  amount,
  documentTitle,
}: WhatsAppShareModalProps) {
  const resolvedType = (type || (shareType as 'INVOICE' | 'RECEIPT' | 'STATEMENT') || 'INVOICE') as 'INVOICE' | 'RECEIPT' | 'STATEMENT';
  const resolvedPhone = defaultPhone || customerPhone || '';
  const resolvedName = defaultName || customerName || '';
  const [recipientPhone, setRecipientPhone] = useState(resolvedPhone);
  const [loading, setLoading] = useState(false);
  const [sendingApi, setSendingApi] = useState(false);
  const [messagePreview, setMessagePreview] = useState('');
  const [clickToChatUrl, setClickToChatUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [config, setConfig] = useState<{ status: string; autoRemindersEnabled: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecipientPhone(resolvedPhone);
      setApiSuccess(null);
      setApiError(null);
      loadConfig();
      fetchSharePayload(resolvedPhone);
    }
  }, [isOpen, resolvedPhone, invoiceId, paymentId, customerId, resolvedType]);

  async function loadConfig() {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch {
      // ignore
    }
  }

  async function fetchSharePayload(phone: string) {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/whatsapp/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: resolvedType,
          invoiceId,
          paymentId,
          customerId,
          customPhone: phone,
          logShare: false, // Don't log until user actually clicks send or opens
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessagePreview(data.message);
        setClickToChatUrl(data.clickToChatUrl);
        setDocumentUrl(data.documentUrl || '');
      } else {
        setApiError(data.error || 'Failed to generate share link');
      }
    } catch {
      setApiError('Network error generating share link');
    } finally {
      setLoading(false);
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setRecipientPhone(val);
  }

  function handlePhoneBlur() {
    fetchSharePayload(recipientPhone);
  }

  async function handleOpenWhatsApp() {
    // Log manual share in background
    try {
      fetch('/api/whatsapp/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: resolvedType,
          invoiceId,
          paymentId,
          customerId,
          customPhone: recipientPhone,
          logShare: true,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    if (clickToChatUrl) {
      window.open(clickToChatUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleSendViaCloudApi() {
    setSendingApi(true);
    setApiError(null);
    setApiSuccess(null);

    let messageType = 'INVOICE_SHARE';
    if (resolvedType === 'RECEIPT') messageType = 'PAYMENT_RECEIPT';
    if (resolvedType === 'STATEMENT') messageType = 'ACCOUNT_STATEMENT';

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          recipientName: resolvedName,
          messageType,
          messageText: messagePreview,
          customerId,
          invoiceId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setApiSuccess('Message dispatched successfully via Official WhatsApp Business API!');
      } else {
        setApiError(data.error || 'Failed to send message via Cloud API.');
      }
    } catch {
      setApiError('Network error calling WhatsApp API.');
    } finally {
      setSendingApi(false);
    }
  }

  function handleCopyMessage() {
    navigator.clipboard.writeText(messagePreview);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  }

  function handleCopyLink() {
    if (documentUrl) {
      navigator.clipboard.writeText(documentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  if (!isOpen) return null;

  const isCloudApiConnected = config?.status === 'CONNECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Share via WhatsApp
              </h3>
              <p className="text-[11px] text-emerald-800 font-medium">
                {documentTitle || `${(resolvedType || 'document').toLowerCase()} for ${resolvedName || 'Customer'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipient Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer WhatsApp Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipientPhone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder="e.g. 9876543210 or +91 98765 43210"
                className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => fetchSharePayload(recipientPhone)}
                disabled={loading}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Indian 10-digit numbers automatically formatted with country code +91.
            </p>
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Personalized Message Preview
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium"
                >
                  {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedMessage ? 'Copied' : 'Copy Text'}
                </button>
                {documentUrl && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? 'Copied' : 'Copy Doc Link'}
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              {loading ? (
                <div className="h-40 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                </div>
              ) : (
                <textarea
                  readOnly
                  rows={6}
                  value={messagePreview}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 leading-relaxed resize-none focus:outline-hidden"
                />
              )}
            </div>
          </div>

          {/* Secure Document Link Notice */}
          {documentUrl && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-tight">
                Includes an authorized, time-limited signed PDF link that customers can open without logging in.
              </p>
            </div>
          )}

          {/* Status Feedback */}
          {apiSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{apiSuccess}</span>
            </div>
          )}

          {apiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Action Explanations */}
          <div className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <p className="font-semibold text-amber-900 mb-0.5">How WhatsApp sharing works:</p>
            <p>
              Clicking <strong>Open in WhatsApp</strong> opens WhatsApp Web or your mobile app with the pre-filled message. You must review and press send in WhatsApp.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {isCloudApiConnected && (
              <button
                type="button"
                onClick={handleSendViaCloudApi}
                disabled={sendingApi || loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60"
              >
                {sendingApi ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send via Cloud API</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={loading || !clickToChatUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
