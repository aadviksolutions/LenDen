import QRCode from 'qrcode';

export interface UpiQrOptions {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber?: string;
  transactionNote?: string;
}

/**
 * Builds standard National Payments Corporation of India (NPCI) UPI payment URI.
 * Spec: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}
 */
export function buildUpiPaymentUri({
  upiId,
  payeeName,
  amount,
  invoiceNumber,
  transactionNote,
}: UpiQrOptions): string {
  const cleanUpiId = upiId.trim();
  const cleanPayeeName = payeeName.trim().slice(0, 50); // NPCI max 50 chars
  const note = (transactionNote || `Bill ${invoiceNumber || ''}`).trim().slice(0, 50);
  const formattedAmount = Math.max(0, amount).toFixed(2);

  const params = new URLSearchParams();
  params.set('pa', cleanUpiId);
  params.set('pn', cleanPayeeName);
  params.set('mc', '');
  params.set('tid', '');
  params.set('tr', invoiceNumber ? invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '') : '');
  params.set('tn', note);
  params.set('am', formattedAmount);
  params.set('cu', 'INR');

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates base64 PNG Data URL for embedding directly in <img> tags or HTML printouts.
 */
export async function generateUpiQrDataUrl(options: UpiQrOptions): Promise<string> {
  const uri = buildUpiPaymentUri(options);
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: {
      dark: '#0f172a', // Slate 900
      light: '#ffffff',
    },
  });
}

/**
 * Generates inline SVG markup for high-DPI crisp vector printing.
 */
export async function generateUpiQrSvg(options: UpiQrOptions): Promise<string> {
  const uri = buildUpiPaymentUri(options);
  return QRCode.toString(uri, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
