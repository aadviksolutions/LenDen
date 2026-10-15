import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';

export interface CustomerInput {
  name: string;
  mobile: string;
  email?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  gstin?: string | null;
  openingBalance?: number;
  notes?: string | null;
  optedOutWhatsApp?: boolean;
}

/**
 * Retrieves all customers belonging strictly to the specified business tenant.
 * Includes calculated outstanding balances derived from active invoices and opening balance.
 */
export async function getCustomers(businessId: string, search?: string) {
  const where: {
    businessId: string;
    OR?: {
      name?: { contains: string; mode: 'insensitive' };
      mobile?: { contains: string; mode: 'insensitive' };
      gstin?: { contains: string; mode: 'insensitive' };
    }[];
  } = { businessId };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q, mode: 'insensitive' } },
      { gstin: { contains: q, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      invoices: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          total: true,
          paidAmount: true,
          balanceDue: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return customers.map((c) => {
    const invoiceTotal = c.invoices.reduce((acc, inv) => acc + inv.total, 0);
    const invoicePaid = c.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const invoiceOutstanding = c.invoices.reduce((acc, inv) => acc + inv.balanceDue, 0);
    const totalOutstanding = round2((c.openingBalance || 0) + invoiceOutstanding);

    return {
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      billingAddress: c.billingAddress,
      shippingAddress: c.shippingAddress,
      gstin: c.gstin,
      openingBalance: c.openingBalance,
      notes: c.notes,
      optedOutWhatsApp: c.optedOutWhatsApp,
      createdAt: c.createdAt,
      invoiceCount: c.invoices.length,
      invoiceTotal: round2(invoiceTotal),
      invoicePaid: round2(invoicePaid),
      totalOutstanding,
    };
  });
}

/**
 * Retrieves customer detail by ID with full transaction ledger history.
 * Strictly verifies business tenant ownership.
 */
export async function getCustomerById(businessId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId,
    },
    include: {
      invoices: {
        orderBy: { invoiceDate: 'desc' },
        include: {
          items: true,
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return null;
  }

  const activeInvoices = customer.invoices.filter((i) => i.status !== 'CANCELLED');
  const invoiceTotal = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const invoicePaid = activeInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const invoiceOutstanding = activeInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);
  const totalOutstanding = round2((customer.openingBalance || 0) + invoiceOutstanding);

  return {
    ...customer,
    totalOutstanding,
    invoiceTotal: round2(invoiceTotal),
    invoicePaid: round2(invoicePaid),
  };
}

/**
 * Creates a new customer under the authorized business tenant.
 */
export async function createCustomer(businessId: string, input: CustomerInput) {
  const trimmedName = input.name?.trim();
  const trimmedMobile = input.mobile?.trim();

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Customer name must be at least 2 characters.');
  }

  if (!trimmedMobile || trimmedMobile.length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const openingBalance = round2(Number(input.openingBalance) || 0);

  return prisma.customer.create({
    data: {
      businessId,
      name: trimmedName,
      mobile: trimmedMobile,
      email: input.email?.trim().toLowerCase() || null,
      billingAddress: input.billingAddress?.trim() || null,
      shippingAddress: input.shippingAddress?.trim() || null,
      gstin: input.gstin?.trim().toUpperCase() || null,
      openingBalance,
      notes: input.notes?.trim() || null,
      optedOutWhatsApp: input.optedOutWhatsApp ?? false,
    },
  });
}

/**
 * Updates customer details under the authorized business tenant.
 */
export async function updateCustomer(
  businessId: string,
  customerId: string,
  input: Partial<CustomerInput>
) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new Error('Customer not found or unauthorized.');
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      name: input.name ? input.name.trim() : undefined,
      mobile: input.mobile ? input.mobile.trim() : undefined,
      email: input.email !== undefined ? (input.email ? input.email.trim().toLowerCase() : null) : undefined,
      billingAddress: input.billingAddress !== undefined ? input.billingAddress?.trim() || null : undefined,
      shippingAddress: input.shippingAddress !== undefined ? input.shippingAddress?.trim() || null : undefined,
      gstin: input.gstin !== undefined ? (input.gstin ? input.gstin.trim().toUpperCase() : null) : undefined,
      openingBalance: input.openingBalance !== undefined ? round2(Number(input.openingBalance)) : undefined,
      notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
      optedOutWhatsApp: input.optedOutWhatsApp !== undefined ? input.optedOutWhatsApp : undefined,
    },
  });
}
