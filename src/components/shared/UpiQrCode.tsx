'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildUpiPaymentUri } from '@/lib/billing/upiQr';
import { QrCode, AlertCircle, Smartphone } from 'lucide-react';

interface UpiQrCodeProps {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber?: string;
  size?: number;
  showCaption?: boolean;
  className?: string;
}

export function UpiQrCode({
  upiId,
  payeeName,
  amount,
  invoiceNumber,
  size = 160,
  showCaption = true,
  className = '',
}: UpiQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!upiId || !upiId.trim()) {
      setQrDataUrl(null);
      setError('No UPI ID provided');
      return;
    }

    try {
      const uri = buildUpiPaymentUri({
        upiId,
        payeeName: payeeName || 'Merchant',
        amount: Math.max(0, amount),
        invoiceNumber,
      });

      QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: size * 2, // 2x for retina crispness
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => {
          setQrDataUrl(url);
          setError(null);
        })
        .catch((err) => {
          console.error('Failed to generate UPI QR:', err);
          setError('Failed to generate QR code');
        });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid UPI parameters');
    }
  }, [upiId, payeeName, amount, invoiceNumber, size]);

  if (!upiId || !upiId.trim()) {
    return null;
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* QR Code Container */}
      <div className="relative bg-white p-2 rounded-xl border border-slate-200/90 shadow-2xs">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`UPI Payment QR for ${upiId}`}
            style={{ width: `${size}px`, height: `${size}px` }}
            className="block rounded-lg object-contain"
          />
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex items-center justify-center bg-slate-50 rounded-lg animate-pulse"
          >
            <QrCode className="w-8 h-8 text-slate-300" />
          </div>
        )}
      </div>

      {showCaption && (
        <div className="mt-2 space-y-0.5">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800">
            <Smartphone className="w-3 h-3 text-emerald-600" />
            <span>Scan & Pay via UPI</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono tracking-tight">{upiId}</p>
          <div className="flex items-center justify-center gap-1.5 pt-1 text-[9px] font-semibold text-slate-400">
            <span>GPay</span>
            <span>•</span>
            <span>PhonePe</span>
            <span>•</span>
            <span>Paytm</span>
            <span>•</span>
            <span>BHIM</span>
          </div>
        </div>
      )}
    </div>
  );
}
