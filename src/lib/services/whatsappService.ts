import { prisma } from '@/lib/db/prisma';
import {
  WhatsAppConfigStatus,
  WhatsAppMessageType,
  WhatsAppMessageStatus,
} from '@prisma/client';
import {
  sanitizePhoneNumber,
  buildReminderMessage,
  buildInvoiceShareMessage,
  buildPaymentReceiptMessage,
  buildStatementMessage,
} from '@/lib/whatsapp/formatters';
import { generateShareToken } from '@/lib/whatsapp/shareTokens';

export interface WhatsAppConfigInput {
  phoneNumberId?: string | null;
  wabaId?: string | null;
  accessToken?: string | null;
  webhookVerifyToken?: string | null;
  businessDisplayName?: string | null;
  autoRemindersEnabled?: boolean;
  reminderDaysBeforeDue?: number;
  reminderOnDueDate?: boolean;
  reminderDaysAfterDue?: number;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  isPaused?: boolean;
  status?: WhatsAppConfigStatus;
}

export interface SendMessageParams {
  businessId: string;
  recipientPhone: string;
  recipientName?: string;
  messageType: WhatsAppMessageType;
  messageText: string;
  customerId?: string;
  invoiceId?: string;
  actor?: string;
  idempotencyKey?: string;
}

/**
 * Retrieves WhatsApp configuration for a business.
 * Masks access token to prevent accidental exposure to client.
 */
export async function getWhatsAppConfig(businessId: string) {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { businessId },
  });

  if (!config) {
    return {
      id: '',
      businessId,
      status: WhatsAppConfigStatus.NOT_CONFIGURED,
      phoneNumberId: '',
      wabaId: '',
      hasAccessToken: false,
      maskedAccessToken: '',
      webhookVerifyToken: '',
      businessDisplayName: '',
      autoRemindersEnabled: false,
      reminderDaysBeforeDue: 3,
      reminderOnDueDate: true,
      reminderDaysAfterDue: 3,
      quietHoursStart: 21,
      quietHoursEnd: 9,
      isPaused: false,
    };
  }

  const hasAccessToken = !!(config.accessToken && config.accessToken.trim().length > 0);
  const maskedAccessToken = hasAccessToken
    ? `••••••••${config.accessToken!.slice(-4)}`
    : '';

  return {
    ...config,
    hasAccessToken,
    maskedAccessToken,
    accessToken: undefined, // Never expose raw token
  };
}

/**
 * Updates WhatsApp configuration for a business.
 */
export async function updateWhatsAppConfig(
  businessId: string,
  input: WhatsAppConfigInput
) {
  const existing = await prisma.whatsAppConfig.findUnique({
    where: { businessId },
  });

  // Preserve existing token if user passed masked token or omitted it
  let resolvedAccessToken = existing?.accessToken || null;
  if (input.accessToken && !input.accessToken.startsWith('•••') && input.accessToken.trim() !== '') {
    resolvedAccessToken = input.accessToken.trim();
  }

  // Determine status if not explicitly given
  let calculatedStatus = input.status || existing?.status || WhatsAppConfigStatus.NOT_CONFIGURED;
  if (input.phoneNumberId && resolvedAccessToken) {
    if (calculatedStatus === WhatsAppConfigStatus.NOT_CONFIGURED) {
      calculatedStatus = WhatsAppConfigStatus.CONNECTED;
    }
  } else if (!input.phoneNumberId && !resolvedAccessToken) {
    calculatedStatus = WhatsAppConfigStatus.NOT_CONFIGURED;
  }

  const updated = await prisma.whatsAppConfig.upsert({
    where: { businessId },
    create: {
      businessId,
      status: calculatedStatus,
      phoneNumberId: input.phoneNumberId?.trim() || null,
      wabaId: input.wabaId?.trim() || null,
      accessToken: resolvedAccessToken,
      webhookVerifyToken: input.webhookVerifyToken?.trim() || null,
      businessDisplayName: input.businessDisplayName?.trim() || null,
      autoRemindersEnabled: input.autoRemindersEnabled ?? false,
      reminderDaysBeforeDue: input.reminderDaysBeforeDue ?? 3,
      reminderOnDueDate: input.reminderOnDueDate ?? true,
      reminderDaysAfterDue: input.reminderDaysAfterDue ?? 3,
      quietHoursStart: input.quietHoursStart ?? 21,
      quietHoursEnd: input.quietHoursEnd ?? 9,
      isPaused: input.isPaused ?? false,
    },
    update: {
      status: calculatedStatus,
      phoneNumberId: input.phoneNumberId !== undefined ? (input.phoneNumberId?.trim() || null) : undefined,
      wabaId: input.wabaId !== undefined ? (input.wabaId?.trim() || null) : undefined,
      accessToken: resolvedAccessToken,
      webhookVerifyToken: input.webhookVerifyToken !== undefined ? (input.webhookVerifyToken?.trim() || null) : undefined,
      businessDisplayName: input.businessDisplayName !== undefined ? (input.businessDisplayName?.trim() || null) : undefined,
      autoRemindersEnabled: input.autoRemindersEnabled,
      reminderDaysBeforeDue: input.reminderDaysBeforeDue,
      reminderOnDueDate: input.reminderOnDueDate,
      reminderDaysAfterDue: input.reminderDaysAfterDue,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      isPaused: input.isPaused,
    },
  });

  const hasToken = !!(updated.accessToken && updated.accessToken.trim().length > 0);
  return {
    ...updated,
    hasAccessToken: hasToken,
    maskedAccessToken: hasToken ? `••••••••${updated.accessToken!.slice(-4)}` : '',
    accessToken: undefined,
  };
}

/**
 * Tests connection to WhatsApp Cloud API using stored or provided credentials.
 */
export async function testWhatsAppConnection(
  businessId: string,
  credentials?: { phoneNumberId?: string; accessToken?: string }
) {
  let phoneNumberId = credentials?.phoneNumberId;
  let accessToken = credentials?.accessToken;

  if (!phoneNumberId || !accessToken) {
    const config = await prisma.whatsAppConfig.findUnique({ where: { businessId } });
    if (!config || !config.phoneNumberId || !config.accessToken) {
      return {
        success: false,
        message: 'WhatsApp Cloud API credentials (Phone Number ID and Access Token) are not configured.',
      };
    }
    phoneNumberId = phoneNumberId || config.phoneNumberId;
    accessToken = accessToken || config.accessToken;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Meta API Error (${res.status})`;
      // Update config status to ERROR in database
      await prisma.whatsAppConfig.updateMany({
        where: { businessId },
        data: { status: WhatsAppConfigStatus.ERROR },
      });
      return {
        success: false,
        message: errorMsg,
        metaError: data.error,
      };
    }

    // Connection verified! Update status to CONNECTED
    await prisma.whatsAppConfig.updateMany({
      where: { businessId },
      data: {
        status: WhatsAppConfigStatus.CONNECTED,
        businessDisplayName: data.verified_name || undefined,
      },
    });

    return {
      success: true,
      message: 'Connected successfully to WhatsApp Business Platform!',
      details: {
        verifiedName: data.verified_name,
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error testing WhatsApp connection';
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Logs a manual WhatsApp click-to-chat share event in the audit trail.
 */
export async function logManualWhatsAppShare(
  businessId: string,
  params: {
    recipientPhone: string;
    recipientName?: string;
    messageType: WhatsAppMessageType;
    contentSummary: string;
    customerId?: string;
    invoiceId?: string;
    actor?: string;
  }
) {
  const sanitized = sanitizePhoneNumber(params.recipientPhone);
  
  return prisma.whatsAppMessageLog.create({
    data: {
      businessId,
      customerId: params.customerId,
      invoiceId: params.invoiceId,
      recipientPhone: sanitized.isValid ? sanitized.cleanDigits : params.recipientPhone,
      recipientName: params.recipientName,
      messageType: params.messageType,
      status: WhatsAppMessageStatus.SUBMITTED,
      contentSummary: params.contentSummary,
      actor: params.actor || 'Manual Share',
      sentAt: new Date(),
    },
  });
}

/**
 * Sends an automated message using official WhatsApp Business Platform / Cloud API.
 * Fails safely if credentials are not configured — never fakes delivery.
 */
export async function sendWhatsAppCloudMessage(params: SendMessageParams) {
  const {
    businessId,
    recipientPhone,
    recipientName,
    messageType,
    messageText,
    customerId,
    invoiceId,
    actor,
    idempotencyKey,
  } = params;

  // Idempotency check
  if (idempotencyKey) {
    const existing = await prisma.whatsAppMessageLog.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        isDuplicate: true,
        log: existing,
      };
    }
  }

  // Validate phone number
  const sanitized = sanitizePhoneNumber(recipientPhone);
  if (!sanitized.isValid) {
    throw new Error(`Invalid recipient phone number: ${sanitized.error}`);
  }

  // Check customer opt-out status
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });
    if (customer?.optedOutWhatsApp) {
      throw new Error(`Customer has opted out of WhatsApp messages.`);
    }
  }

  // Retrieve business WhatsApp configuration
  const config = await prisma.whatsAppConfig.findUnique({
    where: { businessId },
  });

  if (!config || !config.phoneNumberId || !config.accessToken) {
    throw new Error('WhatsApp Cloud API is not configured for this business. Use manual WhatsApp sharing.');
  }

  if (config.isPaused) {
    throw new Error('WhatsApp messaging is currently paused for this business.');
  }

  // Meta Cloud API Call
  const metaUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: sanitized.cleanDigits,
    type: 'text',
    text: {
      preview_url: true,
      body: messageText,
    },
  };

  try {
    const res = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Meta API Error (${res.status})`;
      // Record failed log
      const failedLog = await prisma.whatsAppMessageLog.create({
        data: {
          businessId,
          customerId,
          invoiceId,
          recipientPhone: sanitized.cleanDigits,
          recipientName,
          messageType,
          status: WhatsAppMessageStatus.FAILED,
          contentSummary: messageText.slice(0, 500),
          errorMessage: errorMsg,
          idempotencyKey,
          actor: actor || 'Automated System',
        },
      });

      return {
        success: false,
        error: errorMsg,
        log: failedLog,
      };
    }

    const providerMessageId = data?.messages?.[0]?.id || null;

    // Record submitted log
    const submittedLog = await prisma.whatsAppMessageLog.create({
      data: {
        businessId,
        customerId,
        invoiceId,
        recipientPhone: sanitized.cleanDigits,
        recipientName,
        messageType,
        status: WhatsAppMessageStatus.SUBMITTED,
        providerMessageId,
        contentSummary: messageText.slice(0, 500),
        idempotencyKey,
        actor: actor || 'Automated System',
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      providerMessageId,
      log: submittedLog,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error communicating with WhatsApp Cloud API';
    const failedLog = await prisma.whatsAppMessageLog.create({
      data: {
        businessId,
        customerId,
        invoiceId,
        recipientPhone: sanitized.cleanDigits,
        recipientName,
        messageType,
        status: WhatsAppMessageStatus.FAILED,
        contentSummary: messageText.slice(0, 500),
        errorMessage: errorMsg,
        idempotencyKey,
        actor: actor || 'Automated System',
      },
    });

    return {
      success: false,
      error: errorMsg,
      log: failedLog,
    };
  }
}

/**
 * Processes incoming delivery status webhooks from Meta WhatsApp Cloud API.
 */
export async function processWebhookStatusUpdate(webhookPayload: Record<string, unknown>) {
  const entry = Array.isArray(webhookPayload.entry) ? webhookPayload.entry[0] : null;
  const changes = Array.isArray(entry?.changes) ? entry.changes[0] : null;
  const value = changes?.value;
  const statuses = Array.isArray(value?.statuses) ? value.statuses : [];

  const results: Array<{ id: string; status: string; updated: boolean }> = [];

  for (const s of statuses) {
    const messageId = s.id;
    const statusStr = (s.status || '').toLowerCase();
    const timestamp = s.timestamp ? new Date(parseInt(s.timestamp, 10) * 1000) : new Date();

    let newStatus: WhatsAppMessageStatus = WhatsAppMessageStatus.SUBMITTED;
    if (statusStr === 'sent') {
      newStatus = WhatsAppMessageStatus.SUBMITTED;
    } else if (statusStr === 'delivered') {
      newStatus = WhatsAppMessageStatus.DELIVERED;
    } else if (statusStr === 'read') {
      newStatus = WhatsAppMessageStatus.READ;
    } else if (statusStr === 'failed') {
      newStatus = WhatsAppMessageStatus.FAILED;
    }

    const existingLog = await prisma.whatsAppMessageLog.findFirst({
      where: { providerMessageId: messageId },
    });

    if (existingLog) {
      await prisma.whatsAppMessageLog.update({
        where: { id: existingLog.id },
        data: {
          status: newStatus,
          deliveredAt: statusStr === 'delivered' || statusStr === 'read' ? timestamp : undefined,
          readAt: statusStr === 'read' ? timestamp : undefined,
          errorMessage: s.errors ? JSON.stringify(s.errors) : undefined,
        },
      });
      results.push({ id: messageId, status: newStatus, updated: true });
    } else {
      results.push({ id: messageId, status: statusStr, updated: false });
    }
  }

  return results;
}

/**
 * Checks if the current local time falls inside configured quiet hours (e.g., 21 to 9).
 */
export function isWithinQuietHours(quietStart: number = 21, quietEnd: number = 9): boolean {
  const currentHour = new Date().getHours();
  if (quietStart > quietEnd) {
    // Over midnight, e.g., 21:00 to 09:00
    return currentHour >= quietStart || currentHour < quietEnd;
  }
  // Same day interval
  return currentHour >= quietStart && currentHour < quietEnd;
}

export interface ReminderJobOptions {
  businessId?: string;
  dryRun?: boolean;
  ignoreQuietHours?: boolean;
  originUrl?: string;
}

export interface ReminderCandidate {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  dueDate: string;
  balanceDue: number;
  triggerType: 'ON_DUE_DATE' | 'BEFORE_DUE_DATE' | 'AFTER_DUE_DATE';
  daysDifference: number;
  shareUrl: string;
  messageText: string;
}

/**
 * Automated Payment Reminder Scheduling Engine.
 * Evaluates pending invoices, verifies customer consent, enforces quiet hours,
 * calculates real-time outstanding balances, and avoids duplicates via idempotency keys.
 */
export async function processPaymentReminders(options: ReminderJobOptions = {}) {
  const { businessId, dryRun = false, ignoreQuietHours = false, originUrl = '' } = options;

  // Fetch businesses to check
  const businesses = await prisma.business.findMany({
    where: businessId ? { id: businessId } : undefined,
    include: {
      whatsAppConfig: true,
    },
  });

  const summary = {
    evaluatedBusinesses: businesses.length,
    candidatesFound: 0,
    sentCount: 0,
    skippedDueToQuietHours: 0,
    skippedDueToOptOut: 0,
    skippedDueToDuplicate: 0,
    errors: [] as string[],
    candidates: [] as ReminderCandidate[],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateStr = today.toISOString().split('T')[0];

  for (const b of businesses) {
    const config = b.whatsAppConfig;
    // Skip if reminders are paused or config is disabled (unless dry run)
    if (config?.isPaused && !dryRun) {
      continue;
    }

    const quietStart = config?.quietHoursStart ?? 21;
    const quietEnd = config?.quietHoursEnd ?? 9;

    if (!ignoreQuietHours && isWithinQuietHours(quietStart, quietEnd) && !dryRun) {
      summary.skippedDueToQuietHours++;
      continue;
    }

    const daysBefore = config?.reminderDaysBeforeDue ?? 3;
    const onDue = config?.reminderOnDueDate ?? true;
    const daysAfter = config?.reminderDaysAfterDue ?? 3;

    // Find unpaid/partial invoices for this business
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        businessId: b.id,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
        balanceDue: { gt: 0 },
      },
      include: {
        customer: true,
      },
    });

    for (const inv of pendingInvoices) {
      // Opt-out check
      if (inv.customer.optedOutWhatsApp) {
        summary.skippedDueToOptOut++;
        continue;
      }

      // Phone check
      const phoneCheck = sanitizePhoneNumber(inv.customer.mobile);
      if (!phoneCheck.isValid) {
        continue;
      }

      // Calculate days difference (dueDate - today) robust to UTC and local timezone offsets
      const invDateObj = new Date(inv.dueDate);
      const invLocalYMD = `${invDateObj.getFullYear()}-${String(invDateObj.getMonth() + 1).padStart(2, '0')}-${String(invDateObj.getDate()).padStart(2, '0')}`;
      const todayLocalYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const invUtcYMD = invDateObj.toISOString().split('T')[0];
      const todayUtcYMD = today.toISOString().split('T')[0];

      let diffDays = Math.round((new Date(invLocalYMD).getTime() - new Date(todayLocalYMD).getTime()) / (1000 * 60 * 60 * 24));
      if (invLocalYMD === todayLocalYMD || invUtcYMD === todayUtcYMD) {
        diffDays = 0;
      }

      let triggerType: 'ON_DUE_DATE' | 'BEFORE_DUE_DATE' | 'AFTER_DUE_DATE' | null = null;

      if (diffDays === 0 && onDue) {
        triggerType = 'ON_DUE_DATE';
      } else if (diffDays === daysBefore) {
        triggerType = 'BEFORE_DUE_DATE';
      } else if (diffDays === -daysAfter) {
        triggerType = 'AFTER_DUE_DATE';
      }

      if (!triggerType) {
        continue;
      }

      // Idempotency key per invoice per trigger type per calendar day
      const idempotencyKey = `REMINDER_${inv.id}_${triggerType}_${todayDateStr}`;

      // Check if already sent today
      const alreadySent = await prisma.whatsAppMessageLog.findUnique({
        where: { idempotencyKey },
      });

      if (alreadySent) {
        summary.skippedDueToDuplicate++;
        continue;
      }

      // Generate secure share token & document link
      const token = generateShareToken('INVOICE', inv.id, b.id, 168); // 7 days valid
      const baseDomain = originUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const docUrl = `${baseDomain}/view/invoice/${inv.id}?token=${token}`;

      const isOverdue = diffDays < 0;
      const daysOverdueCount = isOverdue ? Math.abs(diffDays) : 0;

      const messageText = buildReminderMessage({
        customerName: inv.customerName,
        businessName: b.name,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate.toISOString().split('T')[0],
        balanceDue: inv.balanceDue,
        isOverdue,
        daysOverdue: daysOverdueCount,
        documentUrl: docUrl,
      });

      const candidate: ReminderCandidate = {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerMobile: phoneCheck.cleanDigits,
        dueDate: inv.dueDate.toISOString().split('T')[0],
        balanceDue: inv.balanceDue,
        triggerType,
        daysDifference: diffDays,
        shareUrl: docUrl,
        messageText,
      };

      summary.candidatesFound++;
      summary.candidates.push(candidate);

      // If dry run, do not actually send
      if (dryRun) {
        continue;
      }

      // If official Cloud API is configured and connected, send automatically
      if (config && config.status === WhatsAppConfigStatus.CONNECTED && config.autoRemindersEnabled) {
        try {
          await sendWhatsAppCloudMessage({
            businessId: b.id,
            recipientPhone: phoneCheck.cleanDigits,
            recipientName: inv.customerName,
            messageType: WhatsAppMessageType.PAYMENT_REMINDER,
            messageText,
            customerId: inv.customerId,
            invoiceId: inv.id,
            actor: 'Automated Reminder Engine',
            idempotencyKey,
          });
          summary.sentCount++;
        } catch (sendErr: unknown) {
          const msg = sendErr instanceof Error ? sendErr.message : 'Send error';
          summary.errors.push(`Invoice ${inv.invoiceNumber}: ${msg}`);
        }
      } else {
        // Queue as manual reminder log
        await prisma.whatsAppMessageLog.create({
          data: {
            businessId: b.id,
            customerId: inv.customerId,
            invoiceId: inv.id,
            recipientPhone: phoneCheck.cleanDigits,
            recipientName: inv.customerName,
            messageType: WhatsAppMessageType.PAYMENT_REMINDER,
            status: WhatsAppMessageStatus.QUEUED,
            contentSummary: messageText.slice(0, 500),
            idempotencyKey,
            actor: 'Reminder Scheduler (Queued for Manual Share)',
          },
        });
        summary.sentCount++;
      }
    }
  }

  return summary;
}

/**
 * Retrieves paginated audit logs for a business.
 */
export async function getWhatsAppMessageLogs(
  businessId: string,
  options: {
    status?: WhatsAppMessageStatus;
    messageType?: WhatsAppMessageType;
    customerId?: string;
    invoiceId?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, messageType, customerId, invoiceId, limit = 50, offset = 0 } = options;

  const where = {
    businessId,
    status: status || undefined,
    messageType: messageType || undefined,
    customerId: customerId || undefined,
    invoiceId: invoiceId || undefined,
  };

  const [logs, totalCount] = await Promise.all([
    prisma.whatsAppMessageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        customer: { select: { name: true, mobile: true } },
        invoice: { select: { invoiceNumber: true, total: true, balanceDue: true } },
      },
    }),
    prisma.whatsAppMessageLog.count({ where }),
  ]);

  return { logs, totalCount };
}
