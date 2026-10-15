export interface BusinessProfile {
  id: string;
  name: string;
  legalName: string;
  tradeType: string;
  gstin: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  currency: string;
  plan: string;
  trialDaysRemaining: number;
}

export interface MetricCardData {
  title: string;
  value: string;
  subValue?: string;
  change?: string;
  isPositiveChange?: boolean;
  countLabel?: string;
  trendText?: string;
  variant: 'default' | 'navy' | 'warning' | 'danger' | 'success';
}

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  partyName: string;
  partyPhone: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  gstType: 'B2B (GST)' | 'B2C (Retail)' | 'Exempt';
  gstRate: number;
  paymentMode?: string;
}

export interface UdhaarCustomer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  totalOutstanding: number;
  overdueDays: number;
  creditLimit: number;
  lastPaymentDate: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Primary Account Types for Lenden Platform Architecture:
 * 1. SUPER_ADMIN - Platform owner/developer (global multi-tenant management).
 * 2. BUSINESS_OWNER - Paying client who owns a specific business workspace.
 */
export type AccountType = 'SUPER_ADMIN' | 'BUSINESS_OWNER';

/**
 * Business-Level Subordinate Roles:
 * Delegated operational permissions strictly scoped within a single business workspace.
 * These are NOT platform-owner accounts.
 */
export type BusinessSubordinateRole = 'BILLING_STAFF' | 'ACCOUNTANT' | 'INVENTORY_MANAGER';

/**
 * Union of all system roles
 */
export type SystemRole = AccountType | BusinessSubordinateRole;

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: SystemRole;
  businessId?: string; // Optional for SUPER_ADMIN, required for business workspace users
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  createdAt?: string;
}

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  badge?: string;
  badgeVariant?: 'default' | 'amber' | 'emerald';
}

export interface NavigationItem {
  id: string;
  name: string;
  href: string;
  iconName: string;
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'slate' | 'violet';
  description: string;
}

export interface NavigationGroup {
  id: string;
  title: string;
  scope: 'BUSINESS_WORKSPACE' | 'PLATFORM_ADMIN';
  description: string;
  badge?: string;
  items: NavigationItem[];
}

/**
 * Platform Administration models for SUPER_ADMIN scope
 */
export interface PlatformTenantBusiness {
  id: string;
  businessName: string;
  legalName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  planId: string;
  planName: string;
  subscriptionStatus: 'ACTIVE' | 'TRIALING' | 'SUSPENDED' | 'EXPIRED';
  monthlyRevenue: number;
  renewsOn: string;
  memberCount: number;
  createdAt: string;
}

export interface SubscriptionPlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxMonthlyInvoices: number | 'UNLIMITED';
  maxCounters: number;
  maxBranches: number;
  maxStaffSeats: number;
  whatsAppQuotaMonthly: number;
  gstEInvoicingEnabled: boolean;
  inventoryBarcodeEnabled: boolean;
  isActive: boolean;
}

