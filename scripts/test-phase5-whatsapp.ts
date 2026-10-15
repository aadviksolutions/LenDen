import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  sanitizePhoneNumber,
  buildWhatsAppClickToChatUrl,
  buildInvoiceShareMessage,
  buildPaymentReceiptMessage,
  buildStatementMessage,
  buildReminderMessage,
} from '../src/lib/whatsapp/formatters';
import {
  generateShareToken,
  verifyShareToken,
} from '../src/lib/whatsapp/shareTokens';
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  processPaymentReminders,
  processWebhookStatusUpdate,
  getWhatsAppMessageLogs,
  isWithinQuietHours,
} from '../src/lib/services/whatsappService';
import { createCustomer, updateCustomer } from '../src/lib/services/customerService';
import { createInvoice, voidInvoice } from '../src/lib/services/invoiceService';
import { recordPayment } from '../src/lib/services/paymentService';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runPhase5TestSuite() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 5 TEST SUITE: WHATSAPP BILL SHARING & REMINDERS');
  console.log('======================================================\n');

  // --- SETUP: Create Isolated Test Tenants ---
  console.log('--- SETUP: Provisioning Two Isolated Test Tenants ---');
  const tenantA = await prisma.business.create({
    data: {
      name: 'Phase5 Tenant Alpha',
      currency: 'INR',
    },
  });

  const tenantB = await prisma.business.create({
    data: {
      name: 'Phase5 Tenant Beta',
      currency: 'INR',
    },
  });

  assert(!!tenantA.id && !!tenantB.id, 'Setup: Created isolated test workspaces Tenant A and Tenant B');

  try {
    // =========================================================================
    // TEST GROUP 1: Phone Sanitization & Formatting
    // =========================================================================
    console.log('\n--- TEST GROUP 1: Phone Sanitization & Formatting ---');
    
    // 10 digit Indian mobile
    const res1 = sanitizePhoneNumber('9876543210');
    assert(res1.isValid && res1.cleanDigits === '919876543210', 'Test 1.1: Standard 10-digit mobile prepends 91 country code');

    // Number with +91, spaces and dashes
    const res2 = sanitizePhoneNumber('+91 98765-43210');
    assert(res2.isValid && res2.cleanDigits === '919876543210', 'Test 1.2: Strips spaces, plus signs and dashes');

    // Number with leading zero
    const res3 = sanitizePhoneNumber('09876543210');
    assert(res3.isValid && res3.cleanDigits === '919876543210', 'Test 1.3: Strips leading zero and formats with country code 91');

    // Invalid short number
    const res4 = sanitizePhoneNumber('12345');
    assert(!res4.isValid, 'Test 1.4: Rejects numbers with invalid length');

    // =========================================================================
    // TEST GROUP 2: WhatsApp Click-to-Chat URL Generation
    // =========================================================================
    console.log('\n--- TEST GROUP 2: WhatsApp Click-to-Chat URL Generation ---');

    const clickUrl = buildWhatsAppClickToChatUrl('9876543210', 'Hello ₹1,500 due on 2026-10-15');
    assert(clickUrl.startsWith('https://wa.me/919876543210?text='), 'Test 2.1: Generates valid wa.me URL scheme with clean phone');
    assert(clickUrl.includes('%E2%82%B91%2C500'), 'Test 2.2: Properly URL-encodes currency symbols and punctuation');

    // Pre-filled template tests
    const invMsg = buildInvoiceShareMessage({
      customerName: 'Ramesh Patel',
      businessName: 'Sharma Traders',
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '2026-10-11',
      dueDate: '2026-10-18',
      total: 12500,
      balanceDue: 12500,
      documentUrl: 'https://app.lenden.in/view/invoice/123?token=abc',
    });
    assert(invMsg.includes('Ramesh Patel') && invMsg.includes('INV-2026-001') && invMsg.includes('₹12,500.00'), 'Test 2.3: Invoice message pre-fills customer, invoice number and amount');

    // =========================================================================
    // TEST GROUP 3: Cryptographically Signed Share Tokens
    // =========================================================================
    console.log('\n--- TEST GROUP 3: Cryptographically Signed Share Tokens ---');

    const token = generateShareToken('INVOICE', 'inv-12345', tenantA.id, 24);
    assert(typeof token === 'string' && token.includes('.'), 'Test 3.1: Generated tamper-proof HMAC token');

    const verifySuccess = verifyShareToken(token, 'INVOICE', 'inv-12345', tenantA.id);
    assert(verifySuccess.isValid, 'Test 3.2: Valid token passes cryptographic verification');

    // Tampered token test (altering payload or signature)
    const tamperedToken = token.slice(0, -3) + 'xyz';
    const verifyTampered = verifyShareToken(tamperedToken, 'INVOICE', 'inv-12345', tenantA.id);
    assert(!verifyTampered.isValid, 'Test 3.3: Tampered signature is strictly rejected');

    // Cross-tenant mismatch test
    const verifyCrossTenant = verifyShareToken(token, 'INVOICE', 'inv-12345', tenantB.id);
    assert(!verifyCrossTenant.isValid, 'Test 3.4: Cross-tenant verification attempt is rejected');

    // Expired token test
    const expiredToken = generateShareToken('INVOICE', 'inv-12345', tenantA.id, -1); // Expired 1h ago
    const verifyExpired = verifyShareToken(expiredToken, 'INVOICE', 'inv-12345', tenantA.id);
    assert(!verifyExpired.isValid && Boolean(verifyExpired.error?.includes('expired')), 'Test 3.5: Expired share token is rejected');

    // =========================================================================
    // TEST GROUP 4: WhatsApp Configuration & Tenant Scoping
    // =========================================================================
    console.log('\n--- TEST GROUP 4: WhatsApp Configuration & Tenant Scoping ---');

    // Default configuration for new business
    const initialConfig = await getWhatsAppConfig(tenantA.id);
    assert(initialConfig.status === 'NOT_CONFIGURED', 'Test 4.1: New business defaults to NOT_CONFIGURED status');

    // Update credentials for Tenant A
    const updatedConfig = await updateWhatsAppConfig(tenantA.id, {
      phoneNumberId: 'meta_phone_12345',
      wabaId: 'meta_waba_67890',
      accessToken: 'EAAB_test_token_secret_123',
      webhookVerifyToken: 'tenant_a_webhook_secret',
      businessDisplayName: 'Alpha Enterprise',
      autoRemindersEnabled: true,
      reminderDaysBeforeDue: 2,
      reminderOnDueDate: true,
      reminderDaysAfterDue: 5,
    });

    assert(updatedConfig.status === 'CONNECTED', 'Test 4.2: Config status updates to CONNECTED when phone and token are provided');
    assert(updatedConfig.maskedAccessToken.startsWith('••••••••'), 'Test 4.3: Access token is securely masked');

    // Tenant B isolation: Tenant B config must remain NOT_CONFIGURED
    const tenantBConfig = await getWhatsAppConfig(tenantB.id);
    assert(tenantBConfig.status === 'NOT_CONFIGURED' && !tenantBConfig.phoneNumberId, 'Test 4.4: Tenant B does not inherit or leak Tenant A configuration');

    // =========================================================================
    // TEST GROUP 5: Customer Opt-Out Adherence
    // =========================================================================
    console.log('\n--- TEST GROUP 5: Customer Opt-Out Adherence ---');

    const customerA1 = await createCustomer(tenantA.id, {
      name: 'Anil Kumar',
      mobile: '9876543210',
      optedOutWhatsApp: false,
    });
    assert(customerA1.optedOutWhatsApp === false, 'Test 5.1: Customer created with active WhatsApp consent by default');

    // Update customer to opt out
    const updatedCust = await updateCustomer(tenantA.id, customerA1.id, {
      optedOutWhatsApp: true,
    });
    assert(updatedCust.optedOutWhatsApp === true, 'Test 5.2: Customer opt-out preference updated to true');

    // =========================================================================
    // TEST GROUP 6: Automated Reminder Scheduling Engine & Exclusions
    // =========================================================================
    console.log('\n--- TEST GROUP 6: Automated Reminder Scheduling Engine & Exclusions ---');

    const customerA2 = await createCustomer(tenantA.id, {
      name: 'Sunil Verma',
      mobile: '9812345678',
      optedOutWhatsApp: false,
    });

    const today = new Date();

    // 1. Due Today Invoice for Sunil (Eligible)
    const invDueToday = await createInvoice(tenantA.id, 'user-a', {
      customerId: customerA2.id,
      dueDate: today.toISOString().split('T')[0],
      items: [
        { description: 'Industrial Paint 20L', quantity: 2, rate: 4000, taxRate: 18 },
      ],
    });

    // 2. Already Paid Invoice (Ineligible)
    const invPaid = await createInvoice(tenantA.id, 'user-a', {
      customerId: customerA2.id,
      dueDate: today.toISOString().split('T')[0],
      items: [
        { description: 'Primer 10L', quantity: 1, rate: 2000, taxRate: 18 },
      ],
    });
    await recordPayment(tenantA.id, {
      invoiceId: invPaid.id,
      amount: invPaid.total,
      paymentMethod: 'UPI',
    });

    // 3. Cancelled / Voided Invoice (Ineligible)
    const invCancelled = await createInvoice(tenantA.id, 'user-a', {
      customerId: customerA2.id,
      dueDate: today.toISOString().split('T')[0],
      items: [
        { description: 'Sandpaper Roll', quantity: 5, rate: 200, taxRate: 18 },
      ],
    });
    await voidInvoice(tenantA.id, invCancelled.id, 'Order cancelled by party');

    // 4. Invoice for Opted-Out customer Anil (Should be skipped due to opt-out)
    const invOptedOut = await createInvoice(tenantA.id, 'user-a', {
      customerId: customerA1.id,
      dueDate: today.toISOString().split('T')[0],
      items: [
        { description: 'Brush Set', quantity: 3, rate: 500, taxRate: 18 },
      ],
    });

    // Run reminder evaluation (dry-run mode)
    const reminderResults = await processPaymentReminders({
      businessId: tenantA.id,
      dryRun: true,
      ignoreQuietHours: true,
    });

    assert(reminderResults.candidatesFound === 1, 'Test 6.1: Precisely 1 invoice identified as eligible for today\'s reminder');
    assert(reminderResults.candidates[0]?.invoiceId === invDueToday.id, 'Test 6.2: Correctly matched unpaid due invoice');
    assert(reminderResults.skippedDueToOptOut >= 1, 'Test 6.3: Correctly skipped invoice for opted-out customer');

    // =========================================================================
    // TEST GROUP 7: Idempotency & Duplicate Prevention
    // =========================================================================
    console.log('\n--- TEST GROUP 7: Idempotency & Duplicate Prevention ---');

    // Dispatch reminders first time
    const dispatch1 = await processPaymentReminders({
      businessId: tenantA.id,
      dryRun: false,
      ignoreQuietHours: true,
    });
    assert(dispatch1.sentCount === 1, 'Test 7.1: First reminder dispatch logged exactly 1 message');

    // Immediate second dispatch on same day
    const dispatch2 = await processPaymentReminders({
      businessId: tenantA.id,
      dryRun: false,
      ignoreQuietHours: true,
    });
    assert(dispatch2.sentCount === 0 && dispatch2.skippedDueToDuplicate === 1, 'Test 7.2: Immediate second dispatch skipped due to daily idempotency key');

    // =========================================================================
    // TEST GROUP 8: Meta Webhook Delivery Status Updates
    // =========================================================================
    console.log('\n--- TEST GROUP 8: Meta Webhook Delivery Status Updates ---');

    // Find the log created in Test 7
    const messageLog = await prisma.whatsAppMessageLog.findFirst({
      where: { invoiceId: invDueToday.id },
    });
    assert(!!messageLog, 'Test 8.1: Found message log record in database');

    // Simulate providerMessageId assignment
    const mockProviderMsgId = 'wamid.HBgLOTE5ODEyMzQ1Njc4FQIAEhgg...';
    await prisma.whatsAppMessageLog.update({
      where: { id: messageLog!.id },
      data: { providerMessageId: mockProviderMsgId },
    });

    // Simulate Meta delivery webhook
    const mockWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550234567', phone_number_id: '104829105829104' },
                statuses: [
                  {
                    id: mockProviderMsgId,
                    status: 'delivered',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: '919812345678',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const webhookResult = await processWebhookStatusUpdate(mockWebhookPayload);
    assert(webhookResult.length === 1 && webhookResult[0].status === 'DELIVERED', 'Test 8.2: Webhook successfully parsed and matched delivered status');

    const updatedLog = await prisma.whatsAppMessageLog.findUnique({
      where: { id: messageLog!.id },
    });
    assert(updatedLog?.status === 'DELIVERED' && !!updatedLog.deliveredAt, 'Test 8.3: Message log status transitioned to DELIVERED with timestamp');

    // =========================================================================
    // TEST GROUP 9: Tenant Isolation Across Logs
    // =========================================================================
    console.log('\n--- TEST GROUP 9: Tenant Isolation Across Logs ---');

    const tenantALogs = await getWhatsAppMessageLogs(tenantA.id);
    const tenantBLogs = await getWhatsAppMessageLogs(tenantB.id);

    assert(tenantALogs.totalCount >= 1, 'Test 9.1: Tenant A has audit logs recorded');
    assert(tenantBLogs.totalCount === 0, 'Test 9.2: Tenant B log count is 0; zero cross-tenant leakage');

  } finally {
    // --- CLEANUP ---
    console.log('\n--- CLEANING UP TEST DATA ---');
    await prisma.whatsAppMessageLog.deleteMany({
      where: { businessId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.whatsAppConfig.deleteMany({
      where: { businessId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.payment.deleteMany({
      where: { businessId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { businessId: { in: [tenantA.id, tenantB.id] } } },
    });
    await prisma.invoice.deleteMany({
      where: { businessId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });
    console.log('Cleanup complete.');
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase5TestSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
