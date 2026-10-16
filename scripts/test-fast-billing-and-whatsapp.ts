import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  sanitizePhoneNumber,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppHandoffUrl,
  buildInvoiceShareMessage,
} from '../src/lib/whatsapp/formatters';
import { createCustomer, getCustomers } from '../src/lib/services/customerService';
import { createProduct, getProducts } from '../src/lib/services/inventoryService';
import { createInvoice } from '../src/lib/services/invoiceService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('TEST SUITE: FAST BILLING & WHATSAPP SHARING IMPROVEMENTS');
  console.log('======================================================\n');

  // --- 1. WHATSAPP PHONE SANITIZATION & DUPLICATE COUNTRY CODE GUARD ---
  console.log('--- TEST GROUP 1: WhatsApp Phone Sanitization & Formatting ---');

  const s1 = sanitizePhoneNumber('9876543210');
  assert(s1.isValid && s1.cleanDigits === '919876543210', '1.1: 10-digit Indian number prepends 91');

  const s2 = sanitizePhoneNumber('+91 98765 43210');
  assert(s2.isValid && s2.cleanDigits === '919876543210', '1.2: +91 with spaces normalized to 919876543210');

  const s3 = sanitizePhoneNumber('91919876543210');
  assert(s3.isValid && s3.cleanDigits === '919876543210', '1.3: Accidental duplicate 9191 country code normalized to single 91');

  const s4 = sanitizePhoneNumber('09876543210');
  assert(s4.isValid && s4.cleanDigits === '919876543210', '1.4: Leading zero stripped and formatted with 91');

  const s5 = sanitizePhoneNumber('');
  assert(!s5.isValid, '1.5: Empty phone number marked invalid');

  // --- 2. WHATSAPP MESSAGE FORMATTING & ADAPTATION ---
  console.log('\n--- TEST GROUP 2: WhatsApp Message Formatting & Paid-State Adaptation ---');

  // Unpaid bill
  const unpaidMsg = buildInvoiceShareMessage({
    customerName: 'Aarav Sharma',
    businessName: 'Sharma Traders',
    invoiceNumber: 'INV-2026-27-0042',
    invoiceDate: '2026-10-16',
    total: 5000,
    paidAmount: 2000,
    balanceDue: 3000,
    documentUrl: 'https://app.lenden.in/view/invoice/inv-1?token=xyz',
    upiPaymentLink: 'upi://pay?pa=sharma@upi&am=3000',
  });

  assert(unpaidMsg.startsWith('Namaste *Aarav Sharma*,'), '2.1: Starts with Namaste {customerName}');
  assert(unpaidMsg.includes('Invoice No: *INV-2026-27-0042*'), '2.2: Includes Invoice number');
  assert(unpaidMsg.includes('Total: *₹5,000.00*'), '2.3: Includes Total amount');
  assert(unpaidMsg.includes('Paid: *₹2,000.00*'), '2.4: Includes Paid amount');
  assert(unpaidMsg.includes('Balance Due: *₹3,000.00*'), '2.5: Shows balance due when unpaid');
  assert(unpaidMsg.includes('https://app.lenden.in/view/invoice/inv-1?token=xyz'), '2.6: Includes valid accessible document URL');
  assert(unpaidMsg.includes('upi://pay'), '2.7: Includes UPI link when balance due > 0');

  // Fully paid bill (balanceDue = 0)
  const paidMsg = buildInvoiceShareMessage({
    customerName: 'Pooja Verma',
    businessName: 'Sharma Traders',
    invoiceNumber: 'INV-2026-27-0043',
    invoiceDate: '2026-10-16',
    total: 7500,
    paidAmount: 7500,
    balanceDue: 0,
    documentUrl: 'https://app.lenden.in/view/invoice/inv-2?token=xyz',
  });

  assert(paidMsg.includes('Paid: *₹7,500.00* (Fully Paid)'), '2.8: Highlights Fully Paid status');
  assert(!paidMsg.includes('Balance Due:'), '2.9: Does NOT falsely suggest an outstanding balance on paid bill');
  assert(!paidMsg.includes('Pay via UPI'), '2.10: Does not show UPI payment request on fully paid bill');

  // --- 3. WHATSAPP HANDOFF URL GENERATION ---
  console.log('\n--- TEST GROUP 3: Device Handoff URL Generation ---');

  const mobileUrl = buildWhatsAppHandoffUrl('9876543210', 'Test message', { isMobile: true });
  assert(mobileUrl.startsWith('whatsapp://send?phone=919876543210&text=Test%20message'), '3.1: Mobile app scheme URL generated for native WhatsApp app');

  const webUrl = buildWhatsAppHandoffUrl('9876543210', 'Test message', { preferWeb: true });
  assert(webUrl.startsWith('https://web.whatsapp.com/send?phone=919876543210&text=Test%20message'), '3.2: Desktop WhatsApp Web URL generated');

  const universalUrl = buildWhatsAppHandoffUrl('9876543210', 'Test message');
  assert(universalUrl.startsWith('https://wa.me/919876543210?text=Test%20message'), '3.3: Universal wa.me URL generated as fallback');

  // --- 4. FAST CUSTOMER CREATION (TENANT ISOLATED, OPTIONAL MOBILE, GSTIN VALIDATION) ---
  console.log('\n--- TEST GROUP 4: Fast Customer Creation ---');

  const testBizA = await prisma.business.create({
    data: { name: 'Fast Billing Shop A', currency: 'INR' },
  });

  const testBizB = await prisma.business.create({
    data: { name: 'Fast Billing Shop B', currency: 'INR' },
  });

  try {
    // 4.1 Create customer without mobile (optional for retail walk-in)
    const custNoMobile = await createCustomer(testBizA.id, {
      name: 'Walk-in Cash Customer',
    });
    assert(Boolean(custNoMobile.id && custNoMobile.name === 'Walk-in Cash Customer'), '4.1: Customer created with name only (optional mobile allowed)');
    assert(custNoMobile.mobile === '', '4.2: Missing mobile stored safely as empty string');

    // 4.2 Create customer with valid mobile and GSTIN
    const custWithGstin = await createCustomer(testBizA.id, {
      name: 'Gupta Enterprises',
      mobile: '9827112233',
      gstin: '22AAAAA0000A1Z5',
      billingAddress: 'Main Road, Raipur',
    });
    assert(Boolean(custWithGstin.id && custWithGstin.gstin === '22AAAAA0000A1Z5'), '4.3: Customer created with valid 15-character GSTIN');

    // 4.3 GSTIN validation rejection
    let gstinRejected = false;
    try {
      await createCustomer(testBizA.id, {
        name: 'Invalid GST Party',
        gstin: 'INVALID_GSTIN_123',
      });
    } catch (e: any) {
      gstinRejected = true;
      assert(Boolean(e.message.includes('Invalid GSTIN')), '4.4: Invalid GSTIN format rejected by server validation');
    }
    assert(gstinRejected, '4.5: Prevented creation with invalid GSTIN');

    // 4.4 Duplicate mobile within same tenant rejected
    let duplicateRejected = false;
    try {
      await createCustomer(testBizA.id, {
        name: 'Gupta Brother',
        mobile: '9827112233',
      });
    } catch (e: any) {
      duplicateRejected = true;
      assert(Boolean(e.message.includes('already exists in this business')), '4.6: Duplicate customer mobile within same tenant rejected');
    }
    assert(duplicateRejected, '4.7: Duplicate mobile properly prevented within tenant');

    // 4.5 Same mobile allowed in different tenant (Tenant B)
    const custTenantB = await createCustomer(testBizB.id, {
      name: 'Gupta Branch Raipur',
      mobile: '9827112233',
    });
    assert(Boolean(custTenantB.id && custTenantB.businessId === testBizB.id), '4.8: Tenant isolation preserved: same mobile permitted across different businesses');

    // --- 5. FAST BILLING ITEMS (CUSTOM ON-THE-FLY VS CATALOGUE PERSISTENCE) ---
    console.log('\n--- TEST GROUP 5: Fast Billing Items & Invoice Generation ---');

    // 5.1 Save a new item to catalogue
    const savedProd = await createProduct(
      testBizA.id,
      {
        name: 'Supreme PVC Pipe 10ft',
        sku: 'PIPE-10FT',
        sellingPrice: 350,
        taxRate: 18,
        unit: 'Pcs',
        openingStock: 25,
      },
      'Fast Billing POS'
    );
    assert(Boolean(savedProd.id && savedProd.sellingPrice === 350), '5.1: New product saved to catalogue via fast item workflow');

    // 5.2 Product appears in catalog searches for Biz A
    const searchResults = await getProducts(testBizA.id, { query: 'Supreme' });
    assert(searchResults.length === 1 && searchResults[0].id === savedProd.id, '5.2: Saved item immediately discoverable in catalogue searches');

    // 5.3 Biz B cannot see Biz A catalogue product
    const bizBSearch = await getProducts(testBizB.id, { query: 'Supreme' });
    assert(bizBSearch.length === 0, '5.3: Strict tenant isolation: Biz B does not see Biz A catalogue item');

    // 5.4 Create invoice with BOTH catalogue product AND uncatalogued ad-hoc item
    const invoice = await createInvoice(testBizA.id, 'test-user', {
      customerId: custWithGstin.id,
      dueDate: new Date(Date.now() + 15 * 86400000),
      items: [
        {
          productId: savedProd.id,
          description: 'Supreme PVC Pipe 10ft',
          quantity: 2,
          rate: 350,
          taxRate: 18,
        },
        {
          // Uncatalogued item added on the fly to this bill only
          productId: undefined,
          description: 'Emergency Pipe Fitting Service',
          quantity: 1,
          rate: 500,
          taxRate: 18,
        },
      ],
      paidAmount: 500,
      paymentMethod: 'CASH',
    });

    assert(invoice.items.length === 2, '5.4: Invoice created with 2 items (1 catalogued, 1 ad-hoc custom service)');
    assert(invoice.items.some((i) => i.productId === savedProd.id), '5.5: Catalogued item preserves productId link');
    assert(invoice.items.some((i) => i.productId === null), '5.6: Custom service item stored cleanly with null productId');
    assert(invoice.subtotal === 1200, '5.7: Server strictly calculates correct subtotal (2*350 + 500 = ₹1,200)');
    assert(invoice.taxTotal === 216, '5.8: Server calculates exact 18% GST (18% of 1200 = ₹216)');
    assert(invoice.total === 1416, '5.9: Grand total equals ₹1,416.00');
    assert(invoice.paidAmount === 500 && invoice.balanceDue === 916, '5.10: Financial balances accurate (Paid: ₹500, Due: ₹916)');

    // 5.5 Stock deduction verified for linked catalog item
    const updatedProd = await prisma.product.findUnique({ where: { id: savedProd.id } });
    assert(updatedProd?.currentStock === 23, '5.11: Catalog item stock properly decremented by sale quantity (25 - 2 = 23)');

  } finally {
    // CLEANUP
    console.log('\n--- CLEANING UP TEST DATA ---');
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { businessId: { in: [testBizA.id, testBizB.id] } } },
    });
    await prisma.stockMovement.deleteMany({
      where: { businessId: { in: [testBizA.id, testBizB.id] } },
    });
    await prisma.invoice.deleteMany({
      where: { businessId: { in: [testBizA.id, testBizB.id] } },
    });
    await prisma.product.deleteMany({
      where: { businessId: { in: [testBizA.id, testBizB.id] } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: [testBizA.id, testBizB.id] } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [testBizA.id, testBizB.id] } },
    });
    console.log('Cleanup complete.');
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
