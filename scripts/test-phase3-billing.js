/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { PrismaClient, PlatformRole, BusinessRole, InvoiceStatus, PaymentMethod } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Rounding utility
function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 3 AUTOMATED TEST SUITE: BILLING & INVOICING');
  console.log('======================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  let bizA, bizB, userA, userB;
  let custA, custB;

  try {
    // ------------------------------------------------------------------------
    // TEST GROUP 1: Invoicing Calculation & Rounding Math Engine
    // ------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Invoicing Calculations & Decimal-Safe Rounding ---');

    const { calculateInvoiceTotals } = require('../src/lib/billing/calculator');

    // Test 1.1: Tax Exclusive GST 18% calculation
    const calcExclusive = calculateInvoiceTotals({
      items: [
        {
          description: 'UltraTech Cement 50kg',
          quantity: 50,
          rate: 380,
          discount: 500, // ₹500 discount
          discountType: 'AMOUNT',
          taxRate: 18,
        },
      ],
      gstType: 'CGST_SGST',
      isTaxInclusive: false,
      isGstInvoice: true,
      paidAmount: 0,
      enableRounding: true,
    });

    // 50 * 380 = 19,000 - 500 = 18,500 taxable.
    // 18% GST on 18,500 = 3,330 (CGST 9% = 1,665, SGST 9% = 1,665).
    // Total = 18,500 + 3,330 = 21,830.00
    assert(calcExclusive.subtotal === 18500, 'Test 1.1a: Correct taxable subtotal (₹18,500)');
    assert(calcExclusive.discountTotal === 500, 'Test 1.1b: Correct discount deduction (₹500)');
    assert(calcExclusive.taxTotal === 3330, 'Test 1.1c: Correct 18% GST tax total (₹3,330)');
    assert(calcExclusive.cgstTotal === 1665 && calcExclusive.sgstTotal === 1665, 'Test 1.1d: Equal CGST and SGST split (₹1,665 each)');
    assert(calcExclusive.total === 21830, 'Test 1.1e: Correct final invoice total (₹21,830.00)');

    // Test 1.2: Tax Inclusive GST 18% calculation
    const calcInclusive = calculateInvoiceTotals({
      items: [
        {
          description: 'Retail Hardware Unit',
          quantity: 10,
          rate: 1180, // ₹1,180 per unit tax-inclusive
          discount: 0,
          taxRate: 18,
        },
      ],
      gstType: 'CGST_SGST',
      isTaxInclusive: true,
      isGstInvoice: true,
      paidAmount: 0,
      enableRounding: true,
    });

    // 10 * 1,180 = 11,800 inclusive. Base = 11,800 / 1.18 = 10,000. Tax = 1,800.
    assert(calcInclusive.subtotal === 10000, 'Test 1.2a: Correct base taxable back-calculation (₹10,000)');
    assert(calcInclusive.taxTotal === 1800, 'Test 1.2b: Correct embedded tax extraction (₹1,800)');
    assert(calcInclusive.total === 11800, 'Test 1.2c: Total matches gross inclusive value (₹11,800)');

    // Test 1.3: Inter-state IGST 12% calculation
    const calcIgst = calculateInvoiceTotals({
      items: [
        {
          description: 'Interstate Electrical Wire',
          quantity: 2,
          rate: 5000,
          taxRate: 12,
        },
      ],
      gstType: 'IGST',
      isTaxInclusive: false,
      isGstInvoice: true,
    });
    assert(calcIgst.igstTotal === 1200 && calcIgst.cgstTotal === 0, 'Test 1.3: IGST applies 100% to IGST pool with zero CGST/SGST');

    // Test 1.4: Non-GST / Exempt calculation
    const calcExempt = calculateInvoiceTotals({
      items: [{ description: 'Agricultural Goods', quantity: 1, rate: 2500, taxRate: 18 }],
      gstType: 'EXEMPT',
      isTaxInclusive: false,
      isGstInvoice: false,
    });
    assert(calcExempt.taxTotal === 0 && calcExempt.total === 2500, 'Test 1.4: Exempt billing sets total tax to zero');

    // ------------------------------------------------------------------------
    // SETUP TEST TENANTS & CUSTOMERS
    // ------------------------------------------------------------------------
    console.log('\n--- SETUP: Provisioning Two Isolated Tenant Workspaces ---');

    bizA = await prisma.business.create({
      data: {
        name: `Alpha Enterprises ${testSuffix}`,
        legalName: 'Alpha Enterprises Pvt Ltd',
        tradeType: 'Wholesale Building Materials',
        city: 'Raipur',
        state: 'Chhattisgarh',
        gstin: '22AAAAA1111A1Z1',
      },
    });

    bizB = await prisma.business.create({
      data: {
        name: `Beta Mart ${testSuffix}`,
        legalName: 'Beta Retail LLP',
        tradeType: 'Retail Hardware',
        city: 'Bilaspur',
        state: 'Chhattisgarh',
        gstin: '22BBBBB2222B1Z2',
      },
    });

    custA = await prisma.customer.create({
      data: {
        businessId: bizA.id,
        name: 'Goyal Construction Raipur',
        mobile: '9827111111',
        gstin: '22GGGGG3333G1Z3',
        billingAddress: 'Main Road, Pandri, Raipur',
        openingBalance: 5000, // ₹5,000 opening udhaar
      },
    });

    custB = await prisma.customer.create({
      data: {
        businessId: bizB.id,
        name: 'Sharma Paints Bilaspur',
        mobile: '9827222222',
        openingBalance: 0,
      },
    });

    assert(custA.id && custB.id, 'Setup: Created isolated test customers for Tenant A and Tenant B');

    // ------------------------------------------------------------------------
    // TEST GROUP 2: Concurrency-Safe Unique Invoice Numbering
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Concurrent Invoice Numbering ---');

    const { generateInvoiceNumber } = require('../src/lib/billing/sequence');

    // Concurrently trigger 10 sequential invoice requests in parallel
    const parallelRequests = Array.from({ length: 10 }).map(() =>
      prisma.$transaction(async (tx) => {
        return generateInvoiceNumber(tx, bizA.id, 'INV');
      })
    );

    const generatedNumbers = await Promise.all(parallelRequests);
    const uniqueNumbers = new Set(generatedNumbers);

    assert(
      uniqueNumbers.size === 10,
      `Test 2.1: 10 concurrent requests generated 10 unique invoice numbers (${[...uniqueNumbers][0]} .. ${[...uniqueNumbers][9]})`
    );

    const allHaveCorrectFormat = generatedNumbers.every((n) => /^INV-\d{4}-\d{2}-\d{4}$/.test(n));
    assert(
      allHaveCorrectFormat,
      'Test 2.2: All invoice numbers conform to Indian Fiscal Year standard pattern (INV-YYYY-YY-XXXX)'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 3: Customer & Invoice Tenant Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Strict Tenant Isolation ---');

    const { getCustomers } = require('../src/lib/services/customerService');
    const { createInvoice, getInvoices } = require('../src/lib/services/invoiceService');

    // Test 3.1: Querying customers for Tenant A should never show Tenant B's customer
    const customersForA = await getCustomers(bizA.id);
    const includesCustB = customersForA.some((c) => c.id === custB.id);
    assert(
      !includesCustB && customersForA.some((c) => c.id === custA.id),
      'Test 3.1: Tenant A only sees their own customers; Tenant B customer is strictly isolated'
    );

    // Test 3.2: Tenant A attempting to create an invoice referencing Tenant B's customer is rejected
    let crossTenantErrorCaught = false;
    try {
      await createInvoice(bizA.id, 'user-a', {
        customerId: custB.id, // Belongs to Tenant B!
        dueDate: new Date(),
        items: [{ description: 'Unauthorized Item', quantity: 1, rate: 1000 }],
      });
    } catch (e) {
      crossTenantErrorCaught = true;
    }
    assert(
      crossTenantErrorCaught,
      'Test 3.2: Tenant A cannot create an invoice for a customer belonging to Tenant B'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 4: Partial Payments & Ledger Reconciliation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Invoicing, Partial Payments & Ledger ---');

    const { recordPayment } = require('../src/lib/services/paymentService');

    // Create real invoice for Tenant A (Customer A)
    const newInvA = await createInvoice(bizA.id, 'user-a', {
      customerId: custA.id,
      dueDate: new Date(Date.now() + 10 * 86400000),
      items: [
        {
          description: 'Tata Tiscon TMT Rebars 12mm',
          quantity: 10,
          rate: 1000,
          taxRate: 0, // Keep simple ₹10,000 total for clear payment math
        },
      ],
      paidAmount: 0,
    });

    assert(newInvA.total === 10000 && newInvA.status === 'UNPAID', 'Test 4.1: Initial invoice created with ₹10,000 UNPAID status');
    assert(newInvA.customerName === custA.name, 'Test 4.2: Historical customer name captured on invoice snapshot');

    // Record partial payment 1: ₹3,500
    const pmt1 = await recordPayment(bizA.id, {
      invoiceId: newInvA.id,
      amount: 3500,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI987654321',
      idempotencyKey: `idemp-1-${testSuffix}`,
    });

    assert(
      pmt1.updatedInvoice.paidAmount === 3500 &&
        pmt1.updatedInvoice.balanceDue === 6500 &&
        pmt1.updatedInvoice.status === 'PARTIAL',
      'Test 4.3: First partial payment of ₹3,500 leaves ₹6,500 balance due with PARTIAL status'
    );

    // Idempotency test: Re-submitting payment with the same idempotency key must not duplicate
    const pmt1Duplicate = await recordPayment(bizA.id, {
      invoiceId: newInvA.id,
      amount: 3500,
      paymentMethod: 'UPI',
      idempotencyKey: `idemp-1-${testSuffix}`,
    });
    assert(
      pmt1Duplicate.isDuplicate === true,
      'Test 4.4: Duplicate payment submission prevented via idempotency key'
    );

    // Record partial payment 2: ₹6,500 to fully settle
    const pmt2 = await recordPayment(bizA.id, {
      invoiceId: newInvA.id,
      amount: 6500,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'NEFT555666777',
      idempotencyKey: `idemp-2-${testSuffix}`,
    });

    assert(
      pmt2.updatedInvoice.paidAmount === 10000 &&
        pmt2.updatedInvoice.balanceDue === 0 &&
        pmt2.updatedInvoice.status === 'PAID',
      'Test 4.5: Second payment of ₹6,500 settles invoice in full with PAID status and zero balance'
    );

    // Attempt overpayment
    let overpaymentBlocked = false;
    try {
      await recordPayment(bizA.id, {
        invoiceId: newInvA.id,
        amount: 500,
        paymentMethod: 'CASH',
      });
    } catch {
      overpaymentBlocked = true;
    }
    assert(overpaymentBlocked, 'Test 4.6: Overpayment attempt on fully settled invoice is rejected');

    // ------------------------------------------------------------------------
    // TEST GROUP 5: Invoice Cancellation & Audit Trail
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Cancellation / Voiding Audit Trail ---');

    const { voidInvoice } = require('../src/lib/services/invoiceService');

    // Create another invoice to cancel
    const invToCancel = await createInvoice(bizA.id, 'user-a', {
      customerId: custA.id,
      dueDate: new Date(),
      items: [{ description: 'Defective Delivery Batch', quantity: 1, rate: 3000 }],
    });

    const voided = await voidInvoice(
      bizA.id,
      invToCancel.id,
      'Party returned items due to transit defect',
      'Atul Kumar (Owner)'
    );

    assert(
      voided.status === 'CANCELLED' &&
        voided.cancellationReason === 'Party returned items due to transit defect' &&
        voided.cancelledBy === 'Atul Kumar (Owner)' &&
        voided.balanceDue === 0,
      'Test 5.1: Cancelled invoice preserves cancellation reason, canceller name, timestamp, and clears balance'
    );

    // Attempt payment on cancelled invoice
    let paymentOnCancelledBlocked = false;
    try {
      await recordPayment(bizA.id, {
        invoiceId: invToCancel.id,
        amount: 1000,
        paymentMethod: 'CASH',
      });
    } catch {
      paymentOnCancelledBlocked = true;
    }
    assert(paymentOnCancelledBlocked, 'Test 5.2: Payments cannot be accepted on cancelled/voided invoices');

  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (bizA) {
      await prisma.business.delete({ where: { id: bizA.id } }).catch(() => null);
    }
    if (bizB) {
      await prisma.business.delete({ where: { id: bizB.id } }).catch(() => null);
    }
    await prisma.$disconnect();
    console.log('Clean up complete.');
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
