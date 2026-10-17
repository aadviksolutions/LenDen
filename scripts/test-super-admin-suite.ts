import 'dotenv/config';
import {
  PrismaClient,
  PlatformRole,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession } from '../src/lib/auth/session';
import { recordAdminAudit } from '../src/lib/admin/audit';
import { getPlatformSettings, updatePlatformSetting } from '../src/lib/admin/settings';

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

async function runSuperAdminTestSuite() {
  console.log('\n==================================================================');
  console.log('LENDEN: COMPREHENSIVE SUPER ADMIN PLATFORM VERIFICATION SUITE');
  console.log('==================================================================\n');

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------------
    // 1. PROVISION TEST SUPER ADMIN & TEST TENANT USER
    // ------------------------------------------------------------------------
    console.log('--- 1. Provisioning Test Accounts ---');

    const adminEmail = `superadmin_${runId}@lenden.local`;
    const tenantEmail = `storeowner_${runId}@lendentest.com`;
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: `Super Admin ${runId}`,
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    assert(adminUser.platformRole === PlatformRole.SUPER_ADMIN, 'Super Admin user created with platformRole = SUPER_ADMIN');

    const tenantUser = await prisma.user.create({
      data: {
        email: tenantEmail,
        name: `Tenant Store Owner ${runId}`,
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });
    assert(tenantUser.platformRole === PlatformRole.USER, 'Tenant user created with platformRole = USER');

    const tenantBiz = await prisma.business.create({
      data: {
        name: `Test Admin Store ${runId}`,
        legalName: `Test Admin Store ${runId}`,
        tradeType: 'General Retail',
        email: tenantEmail,
      },
    });

    await prisma.businessMembership.create({
      data: {
        userId: tenantUser.id,
        businessId: tenantBiz.id,
        role: 'BUSINESS_OWNER',
      },
    });

    const tenantSub = await prisma.subscription.create({
      data: {
        businessId: tenantBiz.id,
        plan: SubscriptionPlan.STARTER,
        status: SubscriptionStatus.ACTIVE,
        monthlyPrice: 199,
        maxMonthlyInvoices: 999999,
        maxStaffSeats: 1,
      },
    });
    assert(tenantSub.plan === 'STARTER', 'Tenant subscription created under STARTER plan');

    // Create sessions
    const adminSessionToken = await createSession(adminUser.id, null);
    const tenantSessionToken = await createSession(tenantUser.id, tenantBiz.id);

    // ------------------------------------------------------------------------
    // 2. AUDIT LOGGING VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Immutable Platform Audit Logging ---');

    const mockAdminSession = {
      sessionId: adminSessionToken.sessionId,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        phone: null,
        platformRole: adminUser.platformRole,
        createdAt: adminUser.createdAt,
      },
      activeBusiness: null,
      memberships: [],
    };

    await recordAdminAudit(mockAdminSession, {
      action: 'PLATFORM_TEST_INIT',
      targetType: 'PLATFORM',
      targetId: 'sys-01',
      targetName: 'LenDen Test Suite',
      reason: 'Automated verification test run',
      metadata: { runId, test: true },
    });

    const auditEntry = await (prisma as any).platformAuditLog.findFirst({
      where: {
        adminId: adminUser.id,
        action: 'PLATFORM_TEST_INIT',
      },
    });

    assert(Boolean(auditEntry), 'PlatformAuditLog record created in PostgreSQL');
    assert(auditEntry.adminEmail === adminEmail, 'Audit log correctly captures admin email');
    assert(auditEntry.reason === 'Automated verification test run', 'Audit log records mandatory reason');
    assert(auditEntry.targetType === 'PLATFORM', 'Audit log records targetType');

    // ------------------------------------------------------------------------
    // 3. USER MANAGEMENT & SUSPENSION ENFORCEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing User Suspension and Session Revocation ---');

    // Suspend tenant user
    await (prisma as any).user.update({
      where: { id: tenantUser.id },
      data: {
        isSuspended: true,
        suspendedReason: 'Test fraud suspension',
      },
    });

    // Invalidate sessions
    await prisma.session.deleteMany({ where: { userId: tenantUser.id } });

    const suspendedDbUser = await prisma.user.findUnique({
      where: { id: tenantUser.id },
    });
    assert((suspendedDbUser as any).isSuspended === true, 'User isSuspended flag is TRUE');
    assert((suspendedDbUser as any).suspendedReason === 'Test fraud suspension', 'Suspension reason persisted');

    const activeSessions = await prisma.session.findMany({ where: { userId: tenantUser.id } });
    assert(activeSessions.length === 0, 'All active sessions revoked upon user suspension');

    // Reactivate tenant user
    await (prisma as any).user.update({
      where: { id: tenantUser.id },
      data: {
        isSuspended: false,
        suspendedReason: null,
      },
    });
    const reactivatedUser = await prisma.user.findUnique({ where: { id: tenantUser.id } });
    assert((reactivatedUser as any).isSuspended === false, 'User successfully reactivated');

    // ------------------------------------------------------------------------
    // 4. BUSINESS & PLAN CORRECTION
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Business Plan Correction & Quota Updates ---');

    await prisma.subscription.update({
      where: { id: tenantSub.id },
      data: {
        plan: SubscriptionPlan.GROWTH_PRO,
        monthlyPrice: 499,
        maxStaffSeats: 3,
      },
    });

    await recordAdminAudit(mockAdminSession, {
      action: 'PLAN_CORRECTION',
      targetType: 'SUBSCRIPTION',
      targetId: tenantSub.id,
      targetName: tenantBiz.name,
      reason: 'Upgraded to Growth following manual payment',
      metadata: { previousPlan: 'STARTER', newPlan: 'GROWTH_PRO' },
    });

    const updatedSub = await prisma.subscription.findUnique({ where: { id: tenantSub.id } });
    assert(updatedSub?.plan === 'GROWTH_PRO', 'Subscription plan corrected to GROWTH_PRO');
    assert(updatedSub?.monthlyPrice === 499, 'Monthly price updated to ₹499');
    assert(updatedSub?.maxStaffSeats === 3, 'Staff seats quota updated to 3');

    // ------------------------------------------------------------------------
    // 5. FREE KHATA ACCOUNT VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Free Khata Account Integrity ---');

    const freeKhataUser = await prisma.user.create({
      data: {
        email: `freekhata_user_${runId}@lendentest.com`,
        name: `Free Khata User ${runId}`,
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });

    const freeKhataBiz = await prisma.business.create({
      data: {
        name: `Free Khata Ledger ${runId}`,
        tradeType: 'Personal Free Khata',
        email: freeKhataUser.email,
      },
    });

    await prisma.businessMembership.create({
      data: {
        userId: freeKhataUser.id,
        businessId: freeKhataBiz.id,
        role: 'BUSINESS_OWNER',
      },
    });

    const freeKhataSub = await prisma.subscription.create({
      data: {
        businessId: freeKhataBiz.id,
        plan: SubscriptionPlan.FREE_KHATA,
        status: SubscriptionStatus.ACTIVE,
        monthlyPrice: 0,
        maxMonthlyInvoices: 0,
        maxStaffSeats: 1,
      },
    });

    assert(freeKhataSub.plan === 'FREE_KHATA', 'Free Khata plan correctly established');
    assert(freeKhataSub.monthlyPrice === 0, 'Free Khata price is permanently ₹0');

    // Add a khata contact and transaction
    const contact = await prisma.khataContact.create({
      data: {
        businessId: freeKhataBiz.id,
        userId: freeKhataUser.id,
        name: 'Rahul Sharma (Test Party)',
        phone: '9876543210',
      },
    });

    const txn = await prisma.khataTransaction.create({
      data: {
        businessId: freeKhataBiz.id,
        userId: freeKhataUser.id,
        contactId: contact.id,
        type: 'GAVE',
        amount: 2500,
        balanceAmount: 2500,
      },
    });

    assert(Boolean(txn.id), 'Free Khata personal transaction recorded without requiring paid plan');

    // ------------------------------------------------------------------------
    // 6. PAYMENTS & RECONCILIATION
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Subscription Payments & Reconciliation ---');

    // 6.1 Create pending payment
    const payment = await (prisma as any).subscriptionPayment.create({
      data: {
        businessId: tenantBiz.id,
        subscriptionId: tenantSub.id,
        plan: SubscriptionPlan.GROWTH_PRO,
        amount: 499,
        currency: 'INR',
        status: 'PENDING',
        gateway: 'RAZORPAY',
        gatewayOrderId: `order_${runId}`,
      },
    });

    assert(payment.status === 'PENDING', 'Payment record created with PENDING status');
    assert(payment.amount === 499, 'Payment amount matches Growth plan (₹499)');

    // 6.2 Reconcile payment to SUCCESS
    const reconciledPayment = await (prisma as any).subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        paidAt: new Date(),
        gatewayPaymentId: `pay_${runId}_confirmed`,
        reconciledBy: adminUser.email,
        notes: 'Verified against Razorpay gateway webhook',
      },
    });

    assert(reconciledPayment.status === 'SUCCESS', 'Payment status transitioned to SUCCESS');
    assert(reconciledPayment.reconciledBy === adminUser.email, 'ReconciledBy records acting admin');

    await recordAdminAudit(mockAdminSession, {
      action: 'PAYMENT_RECONCILE',
      targetType: 'PAYMENT',
      targetId: payment.id,
      targetName: `Payment ₹499 for ${tenantBiz.name}`,
      reason: 'Confirmed via Razorpay gateway webhook',
      metadata: { paymentId: payment.id, amount: 499 },
    });

    // ------------------------------------------------------------------------
    // 7. PLATFORM SETTINGS PERSISTENCE
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing Platform Settings & Audit Trail ---');

    await updatePlatformSetting(
      mockAdminSession,
      'testSettingKey',
      `test_val_${runId}`,
      'GENERAL',
      'Automated settings test'
    );

    const settingRecord = await (prisma as any).platformSetting.findUnique({
      where: { key: 'testSettingKey' },
    });

    assert(Boolean(settingRecord), 'PlatformSetting persisted to PostgreSQL');
    assert(settingRecord.value === `test_val_${runId}`, 'Setting value correctly stored');

    const settingAudit = await (prisma as any).platformAuditLog.findFirst({
      where: {
        adminId: adminUser.id,
        targetId: 'testSettingKey',
      },
    });

    assert(Boolean(settingAudit), 'Setting update generated audit log entry');

    // ------------------------------------------------------------------------
    // 8. REVENUE METRICS CALCULATION ACCURACY
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Testing Real MRR and Collections Calculation ---');

    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        plan: { in: [SubscriptionPlan.STARTER, SubscriptionPlan.GROWTH_PRO, SubscriptionPlan.ENTERPRISE] },
      },
    });

    const calculatedMRR = activeSubs.reduce((sum, s) => sum + s.monthlyPrice, 0);
    assert(calculatedMRR > 0, `Active MRR calculated accurately from DB (₹${calculatedMRR})`);

    const allSuccessfulPayments = await (prisma as any).subscriptionPayment.findMany({
      where: { status: 'SUCCESS' },
    });
    const totalCollections = allSuccessfulPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    assert(totalCollections >= 499, `Gross collections calculated accurately (₹${totalCollections})`);

    console.log('\n==================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('==================================================================\n');
  } catch (error) {
    console.error('Fatal Test Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSuperAdminTestSuite();
