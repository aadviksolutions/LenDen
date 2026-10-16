import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/session';
import { PlanKey, OFFICIAL_PLANS } from '@/lib/subscription/plans';
import {
  InvoiceStatus,
  PaymentMethod,
  PurchaseStatus,
  GstType,
  BusinessRole,
  PlatformRole,
  SubscriptionStatus,
} from '@prisma/client';

export interface DemoWorkspaceConfig {
  planKey: PlanKey;
  businessId: string;
  businessName: string;
  id?: string;
  name?: string;
  isDemo?: boolean;
  tradeType: string;
  city: string;
  state: string;
  gstin: string;
  userId: string;
  userName: string;
  userEmail: string;
  monthlyPrice: number;
}

export const DEMO_WORKSPACES: Record<PlanKey, DemoWorkspaceConfig> = {
  FREE_KHATA: {
    planKey: 'FREE_KHATA',
    businessId: 'demo_free_khata_business',
    businessName: 'Personal Udhaar Khata (Demo)',
    tradeType: 'Personal Udhaar Ledger',
    city: 'Raipur',
    state: 'Chhattisgarh',
    gstin: '',
    userId: 'demo_free_khata_user',
    userName: 'Ramesh Kumar',
    userEmail: 'freekhata.demo@lenden.local',
    monthlyPrice: 0,
  },
  STARTER: {
    planKey: 'STARTER',
    businessId: 'demo_starter_business',
    businessName: 'Sharma Kirana & General Store (Starter Demo)',
    tradeType: 'FMCG & Kirana',
    city: 'Raipur',
    state: 'Chhattisgarh',
    gstin: '22AAAAA0000A1Z5',
    userId: 'demo_starter_user',
    userName: 'Amit Sharma',
    userEmail: 'starter.demo@lenden.local',
    monthlyPrice: 199,
  },
  GROWTH: {
    planKey: 'GROWTH',
    businessId: 'demo_growth_business',
    businessName: 'Verma Electricals & Hardware (Growth Demo)',
    tradeType: 'Hardware & Electrical Wholesaler',
    city: 'Indore',
    state: 'Madhya Pradesh',
    gstin: '23AAAAA0000A1Z5',
    userId: 'demo_growth_user',
    userName: 'Rajesh Verma',
    userEmail: 'growth.demo@lenden.local',
    monthlyPrice: 499,
  },
  SCALE: {
    planKey: 'SCALE',
    businessId: 'demo_scale_business',
    businessName: 'Apex Logistics & Multi-Branch Traders (Scale Demo)',
    tradeType: 'Distribution & Building Materials',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstin: '27AAAAA0000A1Z5',
    userId: 'demo_scale_user',
    userName: 'Vikram Singhania',
    userEmail: 'scale.demo@lenden.local',
    monthlyPrice: 999,
  },
};

export type SeededDemoWorkspace = DemoWorkspaceConfig & {
  id: string;
  name: string;
  isDemo: boolean;
};

/**
 * Initializes or resets sample data for a demo workspace.
 */
export async function seedDemoWorkspace(planKey: PlanKey): Promise<SeededDemoWorkspace> {
  const config = DEMO_WORKSPACES[planKey];
  const officialPlan = OFFICIAL_PLANS[planKey];
  const passwordHash = await bcrypt.hash('DemoPassword123!', 10);

  // 1. Upsert Demo User
  await prisma.user.upsert({
    where: { id: config.userId },
    update: {
      name: config.userName,
      email: config.userEmail,
      isDemo: true,
      platformRole: PlatformRole.USER,
    },
    create: {
      id: config.userId,
      name: config.userName,
      email: config.userEmail,
      passwordHash,
      isDemo: true,
      platformRole: PlatformRole.USER,
    },
  });

  // 2. Upsert Demo Business
  await prisma.business.upsert({
    where: { id: config.businessId },
    update: {
      name: config.businessName,
      tradeType: config.tradeType,
      city: config.city,
      state: config.state,
      gstin: config.gstin,
      isDemo: true,
      invoiceTerms: '1. Goods once sold will not be taken back. 2. Interest @18% p.a. charged after 15 days.',
    },
    create: {
      id: config.businessId,
      name: config.businessName,
      tradeType: config.tradeType,
      city: config.city,
      state: config.state,
      gstin: config.gstin,
      isDemo: true,
      invoiceTerms: '1. Goods once sold will not be taken back. 2. Interest @18% p.a. charged after 15 days.',
    },
  });

  // 3. Upsert Membership
  await prisma.businessMembership.upsert({
    where: {
      userId_businessId: {
        userId: config.userId,
        businessId: config.businessId,
      },
    },
    update: { role: BusinessRole.BUSINESS_OWNER },
    create: {
      userId: config.userId,
      businessId: config.businessId,
      role: BusinessRole.BUSINESS_OWNER,
    },
  });

  // 4. Upsert Subscription with unlimited invoices and official limits
  await prisma.subscription.deleteMany({
    where: { businessId: config.businessId },
  });

  await prisma.subscription.create({
    data: {
      businessId: config.businessId,
      plan: officialPlan.prismaEnum,
      status: SubscriptionStatus.ACTIVE,
      monthlyPrice: config.monthlyPrice,
      maxMonthlyInvoices: officialPlan.limits.maxMonthlyInvoices,
      maxStaffSeats: officialPlan.limits.maxUsers,
      maxBranches: officialPlan.limits.maxLocations,
      whatsAppQuota: 500,
      trialDaysRemaining: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400000),
    },
  });

  // 5. Clean existing transactional data for this demo workspace only
  await prisma.payment.deleteMany({ where: { businessId: config.businessId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { businessId: config.businessId } } });
  await prisma.invoice.deleteMany({ where: { businessId: config.businessId } });
  await prisma.supplierPayment.deleteMany({ where: { businessId: config.businessId } });
  await prisma.purchaseItem.deleteMany({ where: { purchase: { businessId: config.businessId } } });
  await prisma.purchase.deleteMany({ where: { businessId: config.businessId } });
  await prisma.supplier.deleteMany({ where: { businessId: config.businessId } });
  await prisma.stockMovement.deleteMany({ where: { businessId: config.businessId } });
  await prisma.product.deleteMany({ where: { businessId: config.businessId } });
  await prisma.customer.deleteMany({ where: { businessId: config.businessId } });
  await prisma.expense.deleteMany({ where: { businessId: config.businessId } });

  // 6. Seed Realistic Customers
  const customer1 = await prisma.customer.create({
    data: {
      businessId: config.businessId,
      name: 'Priya Retail Store',
      mobile: '9820011223',
      email: 'priya@retail.in',
      billingAddress: `Main Road, ${config.city}, ${config.state}`,
      openingBalance: 4500,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      businessId: config.businessId,
      name: 'Mahalaxmi General Traders',
      mobile: '9820044556',
      email: 'mahalaxmi@traders.in',
      billingAddress: `Market Yard, ${config.city}, ${config.state}`,
      openingBalance: 12800,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      businessId: config.businessId,
      name: 'Gupta Kirana & Provisions',
      mobile: '9820077889',
      billingAddress: `Station Road, ${config.city}`,
      openingBalance: 0,
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      businessId: config.businessId,
      name: 'Sharma Bros Enterprises',
      mobile: '9820099001',
      billingAddress: `Industrial Area, ${config.city}`,
      openingBalance: 7200,
    },
  });

  // 7. Seed Realistic Products
  let productsList: Array<{ name: string; sku: string; category: string; buy: number; sell: number; stock: number; reorder: number }> = [];

  if (planKey === 'STARTER') {
    productsList = [
      { name: 'Basmati Rice 5kg Pack', sku: 'RIC-BAS-05', category: 'Grains', buy: 340, sell: 450, stock: 45, reorder: 10 },
      { name: 'Sunflower Cooking Oil 1L', sku: 'OIL-SUN-01', category: 'Edibles', buy: 110, sell: 145, stock: 60, reorder: 15 },
      { name: 'Aashirvaad Shudh Chakki Atta 10kg', sku: 'ATT-AAS-10', category: 'Flour', buy: 320, sell: 420, stock: 22, reorder: 5 },
      { name: 'Tata Salt Iodized 1kg', sku: 'SLT-TAT-01', category: 'Spices', buy: 20, sell: 28, stock: 120, reorder: 20 },
      { name: 'Premium Toor Dal Unpolished 1kg', sku: 'DAL-TOO-01', category: 'Pulses', buy: 125, sell: 165, stock: 35, reorder: 10 },
      { name: 'Refined White Sugar 1kg', sku: 'SUG-WHT-01', category: 'Edibles', buy: 35, sell: 44, stock: 80, reorder: 20 },
    ];
  } else if (planKey === 'GROWTH') {
    productsList = [
      { name: 'Havells 20W LED Batten Tube', sku: 'HAV-LED-20', category: 'Lighting', buy: 180, sell: 260, stock: 6, reorder: 15 }, // low stock
      { name: 'Polycab 1.5 sq mm FR Copper Wire 90m', sku: 'POL-WIR-15', category: 'Cables', buy: 1450, sell: 1950, stock: 8, reorder: 20 }, // low stock
      { name: 'Anchor Roma 6A 1-Way Switch', sku: 'ANC-ROM-06', category: 'Switches', buy: 22, sell: 35, stock: 140, reorder: 30 },
      { name: 'Schneider 32A Double Pole MCB', sku: 'SCH-MCB-32', category: 'Protection', buy: 310, sell: 450, stock: 18, reorder: 10 },
      { name: 'Crompton 1200mm Ceiling Fan (White)', sku: 'CRO-FAN-12', category: 'Appliances', buy: 1250, sell: 1750, stock: 4, reorder: 8 }, // low stock
      { name: 'Goldmedal 16A Modular Socket', sku: 'GLD-SOC-16', category: 'Switches', buy: 55, sell: 85, stock: 65, reorder: 15 },
      { name: 'Finolex 2.5 sq mm Industrial Cable 90m', sku: 'FIN-CAB-25', category: 'Cables', buy: 2350, sell: 3100, stock: 12, reorder: 10 },
      { name: 'Wipro 9W Smart LED Bulb B22', sku: 'WIP-BLB-09', category: 'Lighting', buy: 95, sell: 145, stock: 50, reorder: 15 },
    ];
  } else {
    // SCALE Plan Products
    productsList = [
      { name: 'JSW Fe550D TMT Steel Rebar 12mm (Ton)', sku: 'JSW-TMT-12', category: 'Steel', buy: 54000, sell: 62000, stock: 14, reorder: 5 },
      { name: 'Ultratech Weather Plus OPC Cement (50kg)', sku: 'ULT-CEM-50', category: 'Cement', buy: 310, sell: 390, stock: 450, reorder: 100 },
      { name: 'Asian Paints Apex Ultima White 20L', sku: 'ASN-APX-20', category: 'Paints', buy: 4800, sell: 6200, stock: 8, reorder: 15 }, // low stock
      { name: 'Supreme PVC Pipe 4-inch 6kg (10ft)', sku: 'SUP-PVC-04', category: 'Plumbing', buy: 280, sell: 390, stock: 110, reorder: 25 },
      { name: 'Kajaria Vitrified Floor Tiles 600x600mm', sku: 'KAJ-TIL-60', category: 'Ceramics', buy: 420, sell: 580, stock: 240, reorder: 50 },
      { name: 'Tata Tiscon 10mm Steel Bar Bundle', sku: 'TAT-TIS-10', category: 'Steel', buy: 2200, sell: 2750, stock: 35, reorder: 10 },
      { name: 'Dr Fixit Waterproofing Chemical 20L', sku: 'DRF-WTR-20', category: 'Chemicals', buy: 1850, sell: 2450, stock: 12, reorder: 10 },
      { name: 'Astral CPVC Pipe 1-inch SDR 11', sku: 'AST-CPV-01', category: 'Plumbing', buy: 190, sell: 270, stock: 95, reorder: 20 },
      { name: 'Berger Silk Glamor Luxury Emulsion 10L', sku: 'BRG-SLK-10', category: 'Paints', buy: 2600, sell: 3400, stock: 16, reorder: 8 },
      { name: 'ACC Concrete Plus Cement (50kg)', sku: 'ACC-CON-50', category: 'Cement', buy: 295, sell: 375, stock: 320, reorder: 80 },
    ];
  }

  const createdProducts = [];
  for (const p of productsList) {
    const prod = await prisma.product.create({
      data: {
        businessId: config.businessId,
        name: p.name,
        sku: p.sku,
        category: p.category,
        purchasePrice: p.buy,
        sellingPrice: p.sell,
        currentStock: p.stock,
        openingStock: p.stock + 10,
        lowStockAlert: p.reorder,
        taxRate: 18,
      },
    });
    createdProducts.push(prod);
  }

  // 8. Seed Invoices
  const prodA = createdProducts[0];
  const prodB = createdProducts[1] || prodA;

  // Invoice 1: Paid
  const inv1Total = prodA.sellingPrice * 5 + prodB.sellingPrice * 2;
  const inv1 = await prisma.invoice.create({
    data: {
      businessId: config.businessId,
      customerId: customer1.id,
      invoiceNumber: 'INV-2026-001',
      invoiceDate: new Date(Date.now() - 5 * 86400000),
      dueDate: new Date(Date.now() + 10 * 86400000),
      status: InvoiceStatus.PAID,
      gstType: GstType.CGST_SGST,
      isGstInvoice: true,
      subtotal: inv1Total / 1.18,
      taxTotal: inv1Total - inv1Total / 1.18,
      total: inv1Total,
      paidAmount: inv1Total,
      balanceDue: 0,
      customerName: customer1.name,
      customerMobile: customer1.mobile,
      businessName: config.businessName,
      businessGstin: config.gstin,
    },
  });

  await prisma.invoiceItem.create({
    data: {
      invoiceId: inv1.id,
      productId: prodA.id,
      description: prodA.name,
      quantity: 5,
      rate: prodA.sellingPrice,
      taxRate: 18,
      lineTotal: prodA.sellingPrice * 5,
    },
  });

  await prisma.payment.create({
    data: {
      businessId: config.businessId,
      invoiceId: inv1.id,
      customerId: customer1.id,
      amount: inv1Total,
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: 'UPI/2026/889123',
      notes: 'Received via PhonePe UPI',
    },
  });

  // Invoice 2: Unpaid (Udhaar)
  const inv2Total = prodB.sellingPrice * 8;
  const inv2 = await prisma.invoice.create({
    data: {
      businessId: config.businessId,
      customerId: customer2.id,
      invoiceNumber: 'INV-2026-002',
      invoiceDate: new Date(Date.now() - 2 * 86400000),
      dueDate: new Date(Date.now() + 5 * 86400000),
      status: InvoiceStatus.UNPAID,
      gstType: GstType.CGST_SGST,
      isGstInvoice: true,
      subtotal: inv2Total / 1.18,
      taxTotal: inv2Total - inv2Total / 1.18,
      total: inv2Total,
      paidAmount: 0,
      balanceDue: inv2Total,
      customerName: customer2.name,
      customerMobile: customer2.mobile,
      businessName: config.businessName,
      businessGstin: config.gstin,
    },
  });

  await prisma.invoiceItem.create({
    data: {
      invoiceId: inv2.id,
      productId: prodB.id,
      description: prodB.name,
      quantity: 8,
      rate: prodB.sellingPrice,
      taxRate: 18,
      lineTotal: inv2Total,
    },
  });

  // Invoice 3: Partial
  const inv3Total = 15000;
  await prisma.invoice.create({
    data: {
      businessId: config.businessId,
      customerId: customer4.id,
      invoiceNumber: 'INV-2026-003',
      invoiceDate: new Date(Date.now() - 1 * 86400000),
      dueDate: new Date(Date.now() + 15 * 86400000),
      status: InvoiceStatus.PARTIAL,
      gstType: GstType.CGST_SGST,
      isGstInvoice: true,
      subtotal: inv3Total / 1.18,
      taxTotal: inv3Total - inv3Total / 1.18,
      total: inv3Total,
      paidAmount: 5000,
      balanceDue: 10000,
      customerName: customer4.name,
      customerMobile: customer4.mobile,
      businessName: config.businessName,
      businessGstin: config.gstin,
    },
  });

  // 9. Seed Expenses
  await prisma.expense.createMany({
    data: [
      {
        businessId: config.businessId,
        category: 'Utilities & Power',
        payee: 'State Electricity Board',
        amount: 2850,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        notes: 'Monthly commercial meter bill',
      },
      {
        businessId: config.businessId,
        category: 'Shop Rent',
        payee: 'Property Owner',
        amount: 12000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        notes: 'Commercial space monthly rent',
      },
      {
        businessId: config.businessId,
        category: 'Logistics & Carriage',
        payee: 'Local Transport Tempo',
        amount: 1400,
        paymentMethod: PaymentMethod.CASH,
        notes: 'Goods carriage from wholesale yard',
      },
    ],
  });

  // 10. For Growth & Scale Plans: Seed Suppliers & Purchases
  if (planKey === 'GROWTH' || planKey === 'SCALE') {
    const supp1 = await prisma.supplier.create({
      data: {
        businessId: config.businessId,
        name: 'Havells India Authorized Distributor',
        phone: '9811223344',
        email: 'orders@havellsdist.in',
        gstin: `${config.gstin.slice(0, 2)}AAACH1234A1Z1`,
        address: 'Wholesale Electrical Market, Hub 1',
        openingBalance: 24000,
      },
    });

    const supp2 = await prisma.supplier.create({
      data: {
        businessId: config.businessId,
        name: 'Polycab Cables & Wires Agency',
        phone: '9811556677',
        gstin: `${config.gstin.slice(0, 2)}BBBCP5678B1Z2`,
        openingBalance: 15500,
      },
    });

    // Create a received purchase
    const purch1 = await prisma.purchase.create({
      data: {
        businessId: config.businessId,
        supplierId: supp1.id,
        purchaseNumber: 'PUR-2026-001',
        supplierInvoiceNumber: 'INV/HAV/8920',
        purchaseDate: new Date(Date.now() - 7 * 86400000),
        status: PurchaseStatus.RECEIVED,
        subtotal: 35000,
        taxTotal: 6300,
        total: 41300,
        paidAmount: 20000,
        balanceDue: 21300,
        notes: 'Input Tax Credit eligible consignment',
      },
    });

    await prisma.purchaseItem.create({
      data: {
        purchaseId: purch1.id,
        description: 'Electrical Wholesale Consignment',
        quantity: 50,
        unit: 'Pcs',
        purchaseRate: 700,
        taxRate: 18,
        taxAmount: 6300,
        lineTotal: 41300,
      },
    });

    await prisma.supplierPayment.create({
      data: {
        businessId: config.businessId,
        purchaseId: purch1.id,
        supplierId: supp1.id,
        amount: 20000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: 'NEFT/2026/09912',
      },
    });

    // Create a second draft purchase
    const purch2 = await prisma.purchase.create({
      data: {
        businessId: config.businessId,
        supplierId: supp2.id,
        purchaseNumber: 'PUR-2026-002',
        supplierInvoiceNumber: 'INV/POL/1042',
        purchaseDate: new Date(Date.now() - 2 * 86400000),
        status: PurchaseStatus.DRAFT,
        subtotal: 18000,
        taxTotal: 3240,
        total: 21240,
        paidAmount: 0,
        balanceDue: 21240,
        notes: 'Pending delivery verification from warehouse',
      },
    });

    await prisma.purchaseItem.create({
      data: {
        purchaseId: purch2.id,
        description: 'Polycab Industrial Cable Reels',
        quantity: 12,
        unit: 'Reel',
        purchaseRate: 1500,
        taxRate: 18,
        taxAmount: 3240,
        lineTotal: 21240,
      },
    });
  }

  // 11. Seed Staff Members Based on Plan Limits
  if (planKey === 'GROWTH') {
    const staffMembers = [
      {
        id: `${config.businessId}_staff1`,
        name: 'Ramesh Patel',
        email: 'ramesh.billing@verma.local',
        role: BusinessRole.BILLING_STAFF,
        phone: '9820011001',
      },
      {
        id: `${config.businessId}_staff2`,
        name: 'Sunil Joshi (CA)',
        email: 'sunil.ca@verma.local',
        role: BusinessRole.ACCOUNTANT,
        phone: '9820011002',
      },
    ];
    for (const sm of staffMembers) {
      await prisma.user.upsert({
        where: { id: sm.id },
        update: { name: sm.name, email: sm.email, isDemo: true, platformRole: PlatformRole.USER },
        create: {
          id: sm.id,
          name: sm.name,
          email: sm.email,
          passwordHash,
          isDemo: true,
          platformRole: PlatformRole.USER,
          phone: sm.phone,
        },
      });
      await prisma.businessMembership.upsert({
        where: { userId_businessId: { userId: sm.id, businessId: config.businessId } },
        update: { role: sm.role },
        create: { userId: sm.id, businessId: config.businessId, role: sm.role },
      });
    }
  } else if (planKey === 'SCALE') {
    const staffMembers = [
      {
        id: `${config.businessId}_staff1`,
        name: 'Vikram Singh (Head)',
        email: 'vikram.mgr@apex.local',
        role: BusinessRole.BILLING_STAFF,
        phone: '9830011001',
      },
      {
        id: `${config.businessId}_staff2`,
        name: 'Pooja Mehta (CA)',
        email: 'pooja.ca@apex.local',
        role: BusinessRole.ACCOUNTANT,
        phone: '9830011002',
      },
      {
        id: `${config.businessId}_staff3`,
        name: 'Dinesh Rawat (Yard)',
        email: 'dinesh.stock@apex.local',
        role: BusinessRole.INVENTORY_MANAGER,
        phone: '9830011003',
      },
      {
        id: `${config.businessId}_staff4`,
        name: 'Sanjay Verma (Counter 1)',
        email: 'sanjay.pos1@apex.local',
        role: BusinessRole.BILLING_STAFF,
        phone: '9830011004',
      },
      {
        id: `${config.businessId}_staff5`,
        name: 'Kavita Das (Counter 2)',
        email: 'kavita.pos2@apex.local',
        role: BusinessRole.BILLING_STAFF,
        phone: '9830011005',
      },
      {
        id: `${config.businessId}_staff6`,
        name: 'Manoj Kumar (Counter 3)',
        email: 'manoj.pos3@apex.local',
        role: BusinessRole.BILLING_STAFF,
        phone: '9830011006',
      },
      {
        id: `${config.businessId}_staff7`,
        name: 'Rajesh Nair (Logistics)',
        email: 'rajesh.log@apex.local',
        role: BusinessRole.INVENTORY_MANAGER,
        phone: '9830011007',
      },
      {
        id: `${config.businessId}_staff8`,
        name: 'Alok Gupta (Internal Audit)',
        email: 'alok.audit@apex.local',
        role: BusinessRole.ACCOUNTANT,
        phone: '9830011008',
      },
      {
        id: `${config.businessId}_staff9`,
        name: 'Anil Yadav (Warehouse 2)',
        email: 'anil.wh2@apex.local',
        role: BusinessRole.INVENTORY_MANAGER,
        phone: '9830011009',
      },
    ];
    for (const sm of staffMembers) {
      await prisma.user.upsert({
        where: { id: sm.id },
        update: { name: sm.name, email: sm.email, isDemo: true, platformRole: PlatformRole.USER },
        create: {
          id: sm.id,
          name: sm.name,
          email: sm.email,
          passwordHash,
          isDemo: true,
          platformRole: PlatformRole.USER,
          phone: sm.phone,
        },
      });
      await prisma.businessMembership.upsert({
        where: { userId_businessId: { userId: sm.id, businessId: config.businessId } },
        update: { role: sm.role },
        create: { userId: sm.id, businessId: config.businessId, role: sm.role },
      });
    }
  }

  return {
    ...config,
    id: config.businessId,
    name: config.businessName,
    isDemo: true,
  };
}

/**
 * Creates an authenticated session for the specified demo plan.
 */
export async function enterDemoWorkspace(planKey: PlanKey): Promise<{
  success: boolean;
  sessionToken: string;
  expiresAt: Date;
  planKey: PlanKey;
  config: DemoWorkspaceConfig;
}> {
  // Ensure workspace exists with realistic sample data
  const config = await seedDemoWorkspace(planKey);

  // Generate server session for demo user
  const session = await createSession(config.userId, config.businessId);

  return {
    success: true,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
    planKey,
    config,
  };
}

/**
 * Resets a demo workspace back to its initial sample data.
 */
export async function resetDemoWorkspace(planKey: PlanKey): Promise<{
  success: boolean;
  message: string;
  businessName: string;
}> {
  const config = await seedDemoWorkspace(planKey);
  return {
    success: true,
    message: `Demo workspace for ${planKey} has been restored to sample state.`,
    businessName: config.businessName,
  };
}
