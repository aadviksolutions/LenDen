import 'dotenv/config';
import { PrismaClient, StockMovementType, PurchaseStatus } from '@prisma/client';
import {
  createProduct,
  getProducts,
  getProductById,
  adjustStock,
  getInventoryValuation,
  parseAndValidateCsv,
  commitCsvImport,
} from '../src/lib/services/inventoryService';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
} from '../src/lib/services/supplierService';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  receivePurchase,
  voidPurchase,
  recordSupplierPayment,
} from '../src/lib/services/purchaseService';
import { createInvoice, voidInvoice } from '../src/lib/services/invoiceService';
import { generatePurchaseNumber } from '../src/lib/billing/purchaseSequence';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
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
  console.log('STARTING PHASE 4 TEST SUITE: INVENTORY, PURCHASES & SUPPLIERS');
  console.log('======================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  let bizA: { id: string } | null = null;
  let bizB: { id: string } | null = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Provision Two Isolated Tenant Workspaces
    // ------------------------------------------------------------------------
    console.log('--- SETUP: Provisioning Two Isolated Business Workspaces ---');

    bizA = await prisma.business.create({
      data: {
        name: `Alpha Hardware ${testSuffix}`,
        legalName: 'Alpha Hardware Pvt Ltd',
        city: 'Raipur',
        state: 'Chhattisgarh',
        allowNegativeStock: false,
      },
    });

    bizB = await prisma.business.create({
      data: {
        name: `Beta Building Depot ${testSuffix}`,
        legalName: 'Beta Depot LLP',
        city: 'Bilaspur',
        state: 'Chhattisgarh',
        allowNegativeStock: false,
      },
    });

    assert(Boolean(bizA?.id && bizB?.id), 'Setup: Provisioned test businesses for Tenant A and Tenant B');

    // ------------------------------------------------------------------------
    // TEST GROUP 1: Product Catalog, Opening Stock & CSV Parsing
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 1: Product Catalog, Opening Stock & CSV Validation ---');

    // Test 1.1: Create product with opening stock
    const cementA = await createProduct(
      bizA.id,
      {
        name: 'UltraTech Cement 50kg',
        sku: `CEM-UT-${testSuffix}`,
        category: 'Cement',
        unit: 'Bags',
        purchasePrice: 340,
        sellingPrice: 380,
        taxRate: 18,
        openingStock: 100,
        lowStockAlert: 20,
      },
      'Admin A'
    );

    assert(
      cementA.currentStock === 100 && cementA.openingStock === 100,
      'Test 1.1a: Product created with correct opening and current stock (100 Bags)'
    );

    const movementsCement = await prisma.stockMovement.findMany({
      where: { productId: cementA.id },
    });
    assert(
      movementsCement.length === 1 &&
        movementsCement[0].type === StockMovementType.OPENING_STOCK &&
        movementsCement[0].quantity === 100,
      'Test 1.1b: OPENING_STOCK movement created transactionally upon product creation'
    );

    // Test 1.2: Enforce unique SKU constraint within business
    let duplicateSkuBlocked = false;
    try {
      await createProduct(bizA.id, {
        name: 'Duplicate SKU Product',
        sku: `CEM-UT-${testSuffix}`,
      });
    } catch {
      duplicateSkuBlocked = true;
    }
    assert(duplicateSkuBlocked, 'Test 1.2: Duplicate SKU within the same business is rejected');

    // Test 1.3: CSV Validation with valid and invalid rows
    const rawCsv = `name,sku,category,unit,purchasePrice,sellingPrice,taxRate,openingStock,lowStockAlert
Kamdhenu Steel 12mm,STL-12-${testSuffix},Steel,Kg,65,72,18,500,50
Asian Paints 20L,PNT-20-${testSuffix},Paints,Buckets,3200,3800,28,15,5
,MISSING-NAME,General,Pcs,10,20,18,5,1
Invalid Price Item,BAD-PRICE-${testSuffix},General,Pcs,invalid,20,18,5,1
Duplicate In File,DUP-1-${testSuffix},General,Pcs,10,20,18,5,1
Duplicate In File,DUP-1-${testSuffix},General,Pcs,10,20,18,5,1`;

    const existingSkus = new Set([cementA.sku.toLowerCase()]);
    const { validRows, errors } = parseAndValidateCsv(rawCsv, existingSkus);

    assert(validRows.length === 3, 'Test 1.3a: Correctly extracted 3 valid rows from CSV');
    assert(
      errors.length === 3 &&
        errors.some((e) => e.field === 'name') &&
        errors.some((e) => e.field === 'purchasePrice') &&
        errors.some((e) => e.message.includes('Duplicate SKU')),
      'Test 1.3b: Captured row-level validation errors (missing name, invalid price, intra-file duplicate SKU)'
    );

    // Test 1.4: Commit CSV import
    const commitResult = await commitCsvImport(bizA.id, validRows, 'Test Importer');
    assert(commitResult.count === 3, 'Test 1.4: Batch CSV import committed 3 valid products');

    // ------------------------------------------------------------------------
    // TEST GROUP 2: Supplier Management & Ledger
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Supplier Management & Balances ---');

    const supplierA = await createSupplier(bizA.id, {
      name: `Ambuja Distributors Raipur ${testSuffix}`,
      phone: '9827011222',
      gstin: '22AAAAA9999A1Z9',
      openingBalance: 15000, // ₹15,000 opening payable
    });

    assert(supplierA.openingBalance === 15000, 'Test 2.1: Created supplier with ₹15,000 opening balance');

    const suppliersList = await getSuppliers(bizA.id);
    const foundSupplier = suppliersList.find((s) => s.id === supplierA.id);
    assert(
      foundSupplier?.totalOutstanding === 15000,
      'Test 2.2: Supplier initial outstanding matches opening balance'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 3: Purchase Management, Receiving & Stock Movements
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Purchases, Receiving & Stock Increase ---');

    // Test 3.1: DRAFT purchase must NOT alter stock
    const draftPurchase = await createPurchase(
      bizA.id,
      {
        supplierId: supplierA.id,
        supplierInvoiceNumber: `BILL-${testSuffix}-01`,
        status: PurchaseStatus.DRAFT,
        items: [
          {
            productId: cementA.id,
            description: 'UltraTech Cement 50kg bag',
            quantity: 50,
            unit: 'Bags',
            purchaseRate: 340,
            discount: 0,
            taxRate: 18,
          },
        ],
        paidAmount: 0,
      },
      'Buyer A'
    );

    const cementAfterDraft = await getProductById(bizA.id, cementA.id);
    assert(
      cementAfterDraft?.currentStock === 100,
      'Test 3.1: DRAFT purchase order does not change product stock (still 100)'
    );

    // Test 3.2: Finalizing/Receiving purchase increases stock and records movement
    const receivedPurchase = await receivePurchase(bizA.id, draftPurchase.id, 'Store Incharge');
    assert(receivedPurchase.status === 'RECEIVED', 'Test 3.2a: Purchase marked as RECEIVED');

    const cementAfterReceive = await getProductById(bizA.id, cementA.id);
    assert(
      cementAfterReceive?.currentStock === 150,
      'Test 3.2b: Stock increased from 100 to 150 (+50 Bags) upon goods receipt'
    );

    const purchaseMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: cementA.id,
        type: StockMovementType.PURCHASE_RECEIVED,
        sourceDocumentId: draftPurchase.id,
      },
    });
    assert(
      purchaseMovement?.quantity === 50 && purchaseMovement.newStock === 150,
      'Test 3.2c: PURCHASE_RECEIVED movement recorded with correct previous and new stock'
    );

    // Test 3.3: Attempting to receive an already-received purchase is blocked (prevent double deduction/increment)
    let duplicateReceiveBlocked = false;
    try {
      await receivePurchase(bizA.id, draftPurchase.id);
    } catch {
      duplicateReceiveBlocked = true;
    }
    assert(duplicateReceiveBlocked, 'Test 3.3: Attempt to re-receive an already received purchase is rejected');

    // ------------------------------------------------------------------------
    // TEST GROUP 4: Sales Invoicing Stock Deduction & Negative Stock Policy
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Sales Stock Deduction & Return Reversal ---');

    // Create a customer for Tenant A
    const custA = await prisma.customer.create({
      data: {
        businessId: bizA.id,
        name: `Ramesh Builder ${testSuffix}`,
        mobile: '9827099881',
      },
    });

    // Test 4.1: Sell 30 Bags of cement on an Invoice
    const salesInvoice = await createInvoice(bizA.id, 'Cashier A', {
      customerId: custA.id,
      dueDate: new Date(),
      items: [
        {
          productId: cementA.id,
          description: 'UltraTech Cement 50kg bag',
          quantity: 30,
          unit: 'Bags',
          rate: 380,
          taxRate: 18,
        },
      ],
      paidAmount: 0,
    });

    const cementAfterSale = await getProductById(bizA.id, cementA.id);
    assert(
      cementAfterSale?.currentStock === 120,
      'Test 4.1a: Sales invoice decremented stock from 150 to 120 (-30 Bags)'
    );

    const saleMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: cementA.id,
        type: StockMovementType.SALE_DEDUCTION,
        sourceDocumentId: salesInvoice.id,
      },
    });
    assert(
      saleMovement?.quantity === -30 && saleMovement.newStock === 120,
      'Test 4.1b: SALE_DEDUCTION movement recorded with quantity -30'
    );

    // Test 4.2: Enforce negative stock prevention policy (Available: 120, Attempt to sell: 200)
    let negativeStockBlocked = false;
    try {
      await createInvoice(bizA.id, 'Cashier A', {
        customerId: custA.id,
        dueDate: new Date(),
        items: [
          {
            productId: cementA.id,
            description: 'UltraTech Cement 50kg',
            quantity: 200,
            rate: 380,
          },
        ],
      });
    } catch (err: any) {
      if (err.message.includes('Insufficient stock')) {
        negativeStockBlocked = true;
      }
    }
    assert(
      negativeStockBlocked,
      'Test 4.2: Selling more than available stock is rejected when allowNegativeStock is false'
    );

    // Test 4.3: Voiding invoice returns stock with SALE_RETURN
    await voidInvoice(
      bizA.id,
      salesInvoice.id,
      'Customer cancelled delivery order',
      'Manager A'
    );

    const cementAfterVoid = await getProductById(bizA.id, cementA.id);
    assert(
      cementAfterVoid?.currentStock === 150,
      'Test 4.3a: Stock restored back to 150 upon invoice cancellation'
    );

    const returnMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: cementA.id,
        type: StockMovementType.SALE_RETURN,
        sourceDocumentId: salesInvoice.id,
      },
    });
    assert(
      returnMovement?.quantity === 30 && returnMovement.newStock === 150,
      'Test 4.3b: SALE_RETURN movement recorded with restored quantity (+30)'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 5: Purchase Cancellation & Purchase Returns
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Purchase Cancellation & Reversal ---');

    // Void the received purchase (returning 50 bags to supplier)
    await voidPurchase(
      bizA.id,
      draftPurchase.id,
      'Supplier sent damaged batch, returning goods',
      'Store Manager'
    );

    const cementAfterPurchaseVoid = await getProductById(bizA.id, cementA.id);
    assert(
      cementAfterPurchaseVoid?.currentStock === 100,
      'Test 5.1: Stock reduced back from 150 to 100 upon purchase cancellation'
    );

    const purchaseReturnMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: cementA.id,
        type: StockMovementType.PURCHASE_RETURN,
        sourceDocumentId: draftPurchase.id,
      },
    });
    assert(
      purchaseReturnMovement?.quantity === -50,
      'Test 5.2: PURCHASE_RETURN movement created with -50 quantity'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 6: Supplier Payments & Idempotency
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Supplier Payments & Deduplication ---');

    // Create a new purchase of ₹20,000
    const newPurchase = await createPurchase(bizA.id, {
      supplierId: supplierA.id,
      status: PurchaseStatus.RECEIVED,
      items: [
        {
          productId: cementA.id,
          description: 'Cement Fresh Lot',
          quantity: 20,
          purchaseRate: 340,
          taxRate: 0, // ₹6,800 total
        },
      ],
      paidAmount: 0,
    });

    assert(newPurchase.total === 6800 && newPurchase.balanceDue === 6800, 'Test 6.1: Created purchase with ₹6,800 balance due');

    // Record partial supplier payment of ₹2,500
    const pmtResult1 = await recordSupplierPayment(bizA.id, {
      purchaseId: newPurchase.id,
      amount: 2500,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'NEFT998877',
      idempotencyKey: `supp-pmt-1-${testSuffix}`,
    });

    assert(
      pmtResult1.updatedPurchase.paidAmount === 2500 &&
        pmtResult1.updatedPurchase.balanceDue === 4300,
      'Test 6.2: Partial supplier payment of ₹2,500 leaves ₹4,300 balance due'
    );

    // Idempotency: re-submit duplicate payment
    const duplicatePmt = await recordSupplierPayment(bizA.id, {
      purchaseId: newPurchase.id,
      amount: 2500,
      paymentMethod: 'BANK_TRANSFER',
      idempotencyKey: `supp-pmt-1-${testSuffix}`,
    });
    assert(duplicatePmt.isDuplicate === true, 'Test 6.3: Duplicate supplier payment prevented via idempotency key');

    // Settle remaining ₹4,300
    const pmtResult2 = await recordSupplierPayment(bizA.id, {
      purchaseId: newPurchase.id,
      amount: 4300,
      paymentMethod: 'UPI',
    });
    assert(
      pmtResult2.updatedPurchase.balanceDue === 0,
      'Test 6.4: Final payment settles purchase balance to ₹0.00'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 7: Strict Tenant Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Tenant Isolation Across Products & Purchases ---');

    // Create product in Tenant B
    const prodB = await createProduct(bizB.id, {
      name: 'Tenant B Exclusive Product',
      sku: `PROD-B-${testSuffix}`,
    });

    // Tenant A querying products must never include Tenant B's product
    const prodsA = await getProducts(bizA.id);
    const containsProdB = prodsA.some((p) => p.id === prodB.id);
    assert(!containsProdB, 'Test 7.1: Tenant A catalog does not leak Tenant B products');

    // Tenant A attempting to create purchase with Tenant B's supplier is rejected
    const supplierB = await createSupplier(bizB.id, {
      name: `Supplier B ${testSuffix}`,
      phone: '9999988888',
    });

    let crossTenantPurchaseBlocked = false;
    try {
      await createPurchase(bizA.id, {
        supplierId: supplierB.id, // Belongs to Tenant B!
        items: [{ description: 'Test', quantity: 1, purchaseRate: 100 }],
      });
    } catch {
      crossTenantPurchaseBlocked = true;
    }
    assert(crossTenantPurchaseBlocked, 'Test 7.2: Tenant A cannot create purchases with Tenant B supplier');

    // ------------------------------------------------------------------------
    // TEST GROUP 8: Concurrent Sequential Purchase Numbering
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: Sequential Purchase Numbering Concurrency ---');

    const parallelPurchaseNumbers = await Promise.all(
      Array.from({ length: 8 }).map(() => generatePurchaseNumber(prisma, bizA!.id, 'PUR'))
    );
    const uniquePurchaseNumbers = new Set(parallelPurchaseNumbers);

    assert(
      uniquePurchaseNumbers.size === 8,
      `Test 8.1: 8 concurrent requests generated 8 unique sequential numbers (${[...uniquePurchaseNumbers][0]} .. ${[...uniquePurchaseNumbers][7]})`
    );
    assert(
      parallelPurchaseNumbers.every((n) => /^PUR-\d{4}-\d{2}-\d{4}$/.test(n)),
      'Test 8.2: All purchase numbers conform to Indian Fiscal Year standard pattern (PUR-YYYY-YY-XXXX)'
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 9: Inventory Valuation KPI Engine
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Inventory Valuation & KPI Engine ---');

    const valuation = await getInventoryValuation(bizA.id);
    assert(
      valuation.totalItems >= 4 &&
        valuation.totalValuationCost > 0 &&
        valuation.totalValuationRetail > valuation.totalValuationCost,
      'Test 9.1: Correctly calculates catalog items, total cost valuation and positive profit potential'
    );
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (bizA?.id) {
      await prisma.business.delete({ where: { id: bizA.id } }).catch(() => null);
    }
    if (bizB?.id) {
      await prisma.business.delete({ where: { id: bizB.id } }).catch(() => null);
    }
    await prisma.$disconnect();
    console.log('Cleanup complete.');
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
