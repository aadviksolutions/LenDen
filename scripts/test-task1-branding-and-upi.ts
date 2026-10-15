import assert from 'assert';
import { buildUpiPaymentUri, generateUpiQrDataUrl, generateUpiQrSvg } from '../src/lib/billing/upiQr';
import prisma from '../src/lib/prisma';
import { createInvoice } from '../src/lib/services/invoiceService';

async function runTask1Tests() {
  console.log('\n======================================================');
  console.log('STARTING TASK 1 TEST SUITE: BRANDING & UPI QR ENGINE');
  console.log('======================================================\n');

  try {
    // ---------------------------------------------------------
    // TEST GROUP 1: NPCI UPI URI Specification Compliance
    // ---------------------------------------------------------
    console.log('--- TEST GROUP 1: NPCI UPI URI Format & Validation ---');

    const uri = buildUpiPaymentUri({
      upiId: 'laxmi.stores@okhdfcbank',
      payeeName: 'Laxmi Kirana & General Store',
      amount: 1450.5,
      invoiceNumber: 'INV-2026-27-0042',
      transactionNote: 'Bill Payment',
    });

    assert(uri.startsWith('upi://pay?'), 'Test 1.1: Scheme must strictly start with upi://pay?');
    assert(uri.includes('pa=laxmi.stores%40okhdfcbank') || uri.includes('pa=laxmi.stores@okhdfcbank'), 'Test 1.2: Correctly encodes VPA');
    assert(uri.includes('am=1450.50'), 'Test 1.3: Strictly formats amount to 2 decimal places');
    assert(uri.includes('cu=INR'), 'Test 1.4: Currency parameter is locked to INR');
    assert(uri.includes('tn='), 'Test 1.5: Transaction note is populated');
    console.log('  ✓ PASS: NPCI UPI URI conforms to National Payments standard');

    // ---------------------------------------------------------
    // TEST GROUP 2: QR Code DataURL & SVG Vector Generation
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 2: QR Code DataURL & Vector Generation ---');

    const dataUrl = await generateUpiQrDataUrl({
      upiId: 'laxmi.stores@okhdfcbank',
      payeeName: 'Laxmi Kirana',
      amount: 500,
      invoiceNumber: 'INV-001',
    });

    assert(dataUrl.startsWith('data:image/png;base64,'), 'Test 2.1: Generates valid base64 PNG data URL');
    assert(dataUrl.length > 500, 'Test 2.2: Generated QR data URL contains valid graphic payload');

    const svg = await generateUpiQrSvg({
      upiId: 'laxmi.stores@okhdfcbank',
      payeeName: 'Laxmi Kirana',
      amount: 500,
      invoiceNumber: 'INV-001',
    });

    assert(svg.includes('<svg') && svg.includes('</svg>'), 'Test 2.3: Generates crisp inline vector SVG for printing');
    console.log('  ✓ PASS: QR code generators produce verified PNG DataURL and vector SVG');

    // ---------------------------------------------------------
    // TEST GROUP 3: Database Persistence of Custom Logo
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Business Logo & Invoice Historical Snapshot ---');

    // Find test business or demo store
    let business = await prisma.business.findFirst({
      where: { email: 'owner@laxmistores.com' },
    });

    if (!business) {
      business = await prisma.business.findFirst();
    }

    assert(business, 'Test 3.1: Active business exists in database');

    const sampleLogoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const updatedBiz = await prisma.business.update({
      where: { id: business.id },
      data: {
        logoUrl: sampleLogoDataUrl,
        bankUpiId: 'laxmi.stores@okhdfcbank',
      },
    });

    assert(updatedBiz.logoUrl === sampleLogoDataUrl, 'Test 3.2: Custom logo saved to business profile');
    assert(updatedBiz.bankUpiId === 'laxmi.stores@okhdfcbank', 'Test 3.3: Business bank UPI ID verified');

    // Create a customer for invoice snapshot test
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          name: 'QR Test Customer',
          mobile: '9876543210',
        },
      });
    }

    const invoice = await createInvoice(business.id, 'test-user', {
      customerId: customer.id,
      dueDate: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'UPI QR Test Item',
          quantity: 1,
          rate: 1200,
          taxRate: 18,
        },
      ],
    });

    assert(invoice.businessLogoUrl === sampleLogoDataUrl, 'Test 3.4: Invoice created preserves historical businessLogoUrl');
    assert(invoice.balanceDue > 0, 'Test 3.5: Invoice has positive balance due for payment');
    console.log('  ✓ PASS: Invoice captures businessLogoUrl snapshot and balance due');

    // Clean up test invoice
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });

    console.log('\n======================================================');
    console.log('ALL TASK 1 TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('======================================================\n');
  } catch (error) {
    console.error('Fatal Task 1 Test Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTask1Tests();
