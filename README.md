# Lenden — Billing & Khata Ledger Platform

Lenden is a modern multi-tenant commercial billing, GST invoicing, and Udhaar ledger platform tailored for Indian wholesale and retail commerce.

---

## Architecture Overview

The system architecture cleanly differentiates between platform administration and client business operations:

1. **SUPER_ADMIN** — The platform owner/developer with global authority over subscription plans, tenant account lifecycles, MRR tracking, and platform settings.
2. **BUSINESS_OWNER** — Each paying client who owns an isolated business workspace (`business_id`), managing their profile, GST details, invoices, Udhaar credit ledgers, inventory, and subscription.
   - **Workspace Subordinate Roles**: `BILLING_STAFF` (Cashier/POS), `ACCOUNTANT` (GST & Ledger), and `INVENTORY_MANAGER` (Stock & Godowns). These are business-level authorizations, not platform-owner accounts.

For full architectural details, security requirements, and data isolation specifications, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Planned Navigation Structure

The dashboard UI contains two distinct navigation groups:

- **Business Workspace (Client Portal)**:
  - Dashboard Overview (`/`)
  - Billing & Invoices (`/invoices`)
  - Customers & Udhaar (`/customers`)
  - Products & Inventory (`/inventory`)
  - Purchases & Suppliers (`/purchases`)
  - Expenses (`/expenses`)
  - Reports & Taxes (`/reports`)
  - WhatsApp Automation (`/whatsapp`)
  - Staff & Permissions (`/staff`)
  - My Subscription (`/subscription`)
  - Business Settings (`/settings`)

- **Platform Admin Panel (Super Admin Scope)**:
  - Platform Overview (`/platform-admin`)
  - Business Accounts (`/platform-admin/businesses`)
  - Plans & Feature Limits (`/platform-admin/plans`)
  - Platform Settings (`/platform-admin/settings`)

---

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to preview the application shell.

To run the production build verification:

```bash
npm run build
```
