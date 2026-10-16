/**
 * Utility for formatting and sanitizing phone numbers and generating WhatsApp click-to-chat URLs.
 */

export interface SanitizedPhoneResult {
  isValid: boolean;
  cleanDigits: string;
  formattedDisplay: string;
  error?: string;
}

/**
 * Sanitizes and validates phone numbers, with special handling for Indian phone numbers (10 digits -> 91 prefix).
 * Strips whitespace, dashes, plus signs, brackets, and leading zero.
 */
export function sanitizePhoneNumber(phone: string): SanitizedPhoneResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      cleanDigits: '',
      formattedDisplay: '',
      error: 'Phone number is required.',
    };
  }

  // Remove common punctuation: +, -, spaces, parentheses, dots
  let digits = phone.replace(/[\s\-+().]/g, '');

  // Remove leading zeros (e.g. "09876543210" -> "9876543210")
  while (digits.startsWith('0') && digits.length > 10) {
    digits = digits.substring(1);
  }

  // Handle accidental double country code e.g. 91919876543210 (14 digits) or 9109876543210 (13 digits)
  if (digits.startsWith('9191') && digits.length === 14 && /^[6-9]/.test(digits.substring(4))) {
    digits = digits.substring(2);
  } else if (digits.startsWith('910') && digits.length === 13 && /^[6-9]/.test(digits.substring(3))) {
    digits = `91${digits.substring(3)}`;
  }

  // If exactly 10 digits (standard Indian mobile without country code), prepend Indian country code 91
  if (/^\d{10}$/.test(digits)) {
    digits = `91${digits}`;
  }

  // General international mobile check: between 10 and 15 digits (ITU-T E.164)
  if (!/^\d{10,15}$/.test(digits)) {
    return {
      isValid: false,
      cleanDigits: digits,
      formattedDisplay: phone,
      error: 'Invalid phone number format. Must contain 10 to 15 digits.',
    };
  }

  // Format display string (+91 98765 43210 if 12 digits starting with 91)
  let formattedDisplay = `+${digits}`;
  if (digits.startsWith('91') && digits.length === 12) {
    formattedDisplay = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return {
    isValid: true,
    cleanDigits: digits,
    formattedDisplay,
  };
}

/**
 * Builds a WhatsApp Click-to-Chat URL (wa.me)
 * This opens WhatsApp Web or the WhatsApp App with the message pre-filled.
 */
export function buildWhatsAppClickToChatUrl(phone: string, message: string): string {
  const sanitized = sanitizePhoneNumber(phone);
  const targetDigits = sanitized.isValid ? sanitized.cleanDigits : phone.replace(/\D/g, '');
  return `https://wa.me/${targetDigits}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds WhatsApp handoff URLs tailored for native mobile apps, WhatsApp Web, or universal wa.me.
 */
export function buildWhatsAppHandoffUrl(
  phone: string,
  message: string,
  options: { isMobile?: boolean; preferWeb?: boolean } = {}
): string {
  const sanitized = sanitizePhoneNumber(phone);
  const targetDigits = sanitized.isValid ? sanitized.cleanDigits : phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);

  if (options.preferWeb) {
    return `https://web.whatsapp.com/send?phone=${targetDigits}&text=${encoded}`;
  }

  if (options.isMobile) {
    return `whatsapp://send?phone=${targetDigits}&text=${encoded}`;
  }

  return `https://wa.me/${targetDigits}?text=${encoded}`;
}

export interface InvoiceShareMessageParams {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  total: number;
  paidAmount?: number;
  balanceDue: number;
  documentUrl?: string;
  upiPaymentLink?: string;
}

export function buildInvoiceShareMessage(params: InvoiceShareMessageParams): string {
  const {
    customerName,
    businessName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    total,
    paidAmount,
    balanceDue,
    documentUrl,
    upiPaymentLink,
  } = params;

  const totalFormatted = total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceFormatted = Math.max(0, balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const resolvedPaid = paidAmount !== undefined ? paidAmount : Math.max(0, total - balanceDue);
  const paidFormatted = resolvedPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const billDate = invoiceDate || dueDate || new Date().toISOString().split('T')[0];
  const isFullyPaid = balanceDue <= 0;

  let msg = `Namaste *${customerName}*,\n\n`;
  msg += `Your bill from *${businessName}* is ready.\n\n`;
  msg += `Invoice No: *${invoiceNumber}*\n`;
  msg += `Date: *${billDate}*\n`;
  msg += `Total: *₹${totalFormatted}*\n`;
  if (isFullyPaid) {
    msg += `Paid: *₹${paidFormatted}* (Fully Paid)\n`;
  } else {
    msg += `Paid: *₹${paidFormatted}*\n`;
    msg += `Balance Due: *₹${balanceFormatted}*\n`;
  }

  if (documentUrl) {
    msg += `\n📄 *View/Download Invoice PDF:*\n${documentUrl}\n`;
  }

  if (upiPaymentLink && balanceDue > 0) {
    msg += `\n💳 *Pay via UPI:*\n${upiPaymentLink}\n`;
  }

  msg += `\nThank you for your business.\n— *${businessName}*`;
  return msg;
}

export interface PaymentReceiptMessageParams {
  customerName: string;
  businessName: string;
  receiptNumber?: string;
  invoiceNumber: string;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  remainingBalance: number;
  receiptUrl?: string;
}

export function buildPaymentReceiptMessage(params: PaymentReceiptMessageParams): string {
  const {
    customerName,
    businessName,
    invoiceNumber,
    amountPaid,
    paymentMethod,
    paymentDate,
    remainingBalance,
    receiptUrl,
  } = params;

  const paidFormatted = amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceFormatted = remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let msg = `Hello *${customerName}*,\n\n`;
  msg += `We have successfully received your payment of *₹${paidFormatted}* on *${paymentDate}* for invoice *${invoiceNumber}* via *${paymentMethod}*.\n\n`;
  msg += `🧾 *Payment Details:*\n`;
  msg += `• Amount Received: *₹${paidFormatted}*\n`;
  msg += `• Remaining Balance: *₹${balanceFormatted}*\n`;

  if (receiptUrl) {
    msg += `\n📄 *View/Download Receipt:*\n${receiptUrl}\n`;
  }

  msg += `\nThank you for your prompt payment!\n— *${businessName}*`;
  return msg;
}

export interface StatementMessageParams {
  customerName: string;
  businessName: string;
  totalOutstanding: number;
  statementPeriod?: string;
  statementUrl?: string;
}

export function buildStatementMessage(params: StatementMessageParams): string {
  const {
    customerName,
    businessName,
    totalOutstanding,
    statementPeriod,
    statementUrl,
  } = params;

  const outstandingFormatted = totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let msg = `Hello *${customerName}*,\n\n`;
  msg += `Here is your outstanding account summary (Khata) from *${businessName}*.\n\n`;
  msg += `📊 *Account Status:*\n`;
  msg += `• Total Outstanding: *₹${outstandingFormatted}*\n`;
  if (statementPeriod) {
    msg += `• Period: ${statementPeriod}\n`;
  }

  if (statementUrl) {
    msg += `\n📄 *View Detailed Statement:*\n${statementUrl}\n`;
  }

  msg += `\nPlease review and settle the pending dues at your earliest convenience.\n\nThank you,\n— *${businessName}*`;
  return msg;
}

export interface ReminderMessageParams {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  dueDate: string;
  balanceDue: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  documentUrl?: string;
  upiPaymentLink?: string;
}

export function buildReminderMessage(params: ReminderMessageParams): string {
  const {
    customerName,
    businessName,
    invoiceNumber,
    dueDate,
    balanceDue,
    isOverdue,
    daysOverdue,
    documentUrl,
    upiPaymentLink,
  } = params;

  const balanceFormatted = balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let msg = `⚠️ *Payment Reminder*\n\n`;
  msg += `Hello *${customerName}*,\n\n`;

  if (isOverdue && daysOverdue && daysOverdue > 0) {
    msg += `This is a reminder that invoice *${invoiceNumber}* from *${businessName}* was due on *${dueDate}* and is currently *${daysOverdue} days overdue*.\n\n`;
  } else {
    msg += `This is a friendly reminder that invoice *${invoiceNumber}* from *${businessName}* is due on *${dueDate}*.\n\n`;
  }

  msg += `💰 *Pending Amount: ₹${balanceFormatted}*\n`;

  if (documentUrl) {
    msg += `\n📄 *View Invoice:*\n${documentUrl}\n`;
  }

  if (upiPaymentLink) {
    msg += `\n💳 *Pay Now via UPI:*\n${upiPaymentLink}\n`;
  }

  msg += `\nIf you have already made this payment, please disregard this message.\n\nThank you,\n— *${businessName}*`;
  return msg;
}
