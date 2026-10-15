import { NavigationGroup, NavigationItem } from '@/types';

export type { NavigationItem };

/**
 * 1. Business Workspace Navigation:
 * Accessed by BUSINESS_OWNER and subordinate roles (BILLING_STAFF, ACCOUNTANT, INVENTORY_MANAGER).
 * All routes are scoped strictly to the authenticated user's business tenant workspace.
 */
export const BUSINESS_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Overview',
    href: '/',
    iconName: 'LayoutDashboard',
    description: 'Overview, key sales metrics, cash flow and alerts',
  },
  {
    id: 'invoices',
    name: 'Billing & Invoices',
    href: '/invoices',
    iconName: 'FileText',
    badge: 'GST',
    badgeColor: 'blue',
    description: 'Tax invoices, delivery challans, credit/debit notes',
  },
  {
    id: 'customers',
    name: 'Customers',
    href: '/customers',
    iconName: 'Users',
    description: 'Customer directory and account profiles',
  },
  {
    id: 'customer-ledger',
    name: 'Customer Ledger',
    href: '/customers?view=ledger',
    iconName: 'BookOpen',
    badge: 'Udhaar',
    badgeColor: 'amber',
    description: 'Customer credit ledger, payment reminders, statement',
  },
  {
    id: 'payments',
    name: 'Payments',
    href: '/invoices?view=payments',
    iconName: 'CreditCard',
    description: 'Received collections, payment vouchers and settlements',
  },
  {
    id: 'inventory',
    name: 'Products & Inventory',
    href: '/inventory',
    iconName: 'Package',
    description: 'Stock catalog, HSN/SAC codes, low-stock warnings',
  },
  {
    id: 'purchases',
    name: 'Purchases',
    href: '/purchases',
    iconName: 'Truck',
    description: 'Vendor bills, purchase orders, input tax credit',
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    href: '/suppliers',
    iconName: 'Store',
    description: 'Supplier directory and procurement accounts',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    href: '/expenses',
    iconName: 'Receipt',
    description: 'Operating costs, transport, utilities, petty cash',
  },
  {
    id: 'reports',
    name: 'Reports & Taxes',
    href: '/reports',
    iconName: 'BarChart3',
    badge: 'GSTR',
    badgeColor: 'emerald',
    description: 'Sales ledger, GST summary, profit & loss, balance sheet',
  },
  {
    id: 'settings',
    name: 'Business Settings',
    href: '/settings',
    iconName: 'Settings',
    description: 'Business name, logo, address, GSTIN and invoice branding',
  },
  {
    id: 'subscription',
    name: 'Subscription',
    href: '/subscription',
    iconName: 'Crown',
    badge: 'Pro',
    badgeColor: 'amber',
    description: 'Client workspace subscription plan, renewal & limits',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Automation',
    href: '/whatsapp',
    iconName: 'MessageSquare',
    badge: 'API',
    badgeColor: 'emerald',
    description: 'Automated invoice PDFs, payment reminder broadcasts',
  },
];

/**
 * 2. Platform Administration Navigation:
 * Exclusively for SUPER_ADMIN (Platform Owner / Developer).
 * Global cross-tenant management, subscription plans, limits, and system controls.
 */
export const PLATFORM_ADMIN_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'platform-admin-overview',
    name: 'Platform Overview',
    href: '/platform-admin',
    iconName: 'LayoutGrid',
    badge: 'Admin',
    badgeColor: 'violet',
    description: 'Global SaaS revenue, active businesses, and platform health',
  },
  {
    id: 'platform-admin-businesses',
    name: 'Business Accounts',
    href: '/platform-admin/businesses',
    iconName: 'Building2',
    badge: 'Tenants',
    badgeColor: 'blue',
    description: 'Manage client accounts, activate, suspend, or renew subscriptions',
  },
  {
    id: 'platform-admin-plans',
    name: 'Plans & Feature Limits',
    href: '/platform-admin/plans',
    iconName: 'SlidersHorizontal',
    badge: 'Config',
    badgeColor: 'amber',
    description: 'Configure subscription tiers, quota limits, and feature toggles',
  },
  {
    id: 'platform-admin-settings',
    name: 'Platform Settings',
    href: '/platform-admin/settings',
    iconName: 'ShieldAlert',
    description: 'Global security, gateway credentials, tax APIs and audit logs',
  },
];

/**
 * Navigation Groups for structured sidebar presentation
 */
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'business_workspace',
    title: 'Business Workspace',
    scope: 'BUSINESS_WORKSPACE',
    description: 'Client workspace operations for Business Owners & delegated staff',
    badge: 'Tenant Scope',
    items: BUSINESS_NAVIGATION_ITEMS,
  },
  {
    id: 'platform_administration',
    title: 'Platform Admin Panel',
    scope: 'PLATFORM_ADMIN',
    description: 'Super Admin platform controls for SaaS management',
    badge: 'Super Admin',
    items: PLATFORM_ADMIN_NAVIGATION_ITEMS,
  },
];

/**
 * Backward compatibility alias
 */
export const NAVIGATION_ITEMS: NavigationItem[] = BUSINESS_NAVIGATION_ITEMS;

