import 'dotenv/config';
import {
  PrismaClient,
  SubscriptionPlan,
  SubscriptionStatus,
  BusinessRole,
  PlatformRole,
} from '@prisma/client';
import {
  getBusinessEntitlements,
  checkFeatureEntitlement,
} from '../src/lib/subscription/entitlements';
import { OFFICIAL_PLANS, normalizePlanKey } from '../src/lib/subscription/plans';

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

async function runTestSuite() {
  console.log('\n==================================================================');
  console.log('LENDEN: COMPREHENSIVE PACKAGE-WISE ENTITLEMENT & ACCESS TEST SUITE');
  console.log('==================================================================\n');

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------------
    // 1. FREE KHATA ACCOUNT TEST
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing FREE KHATA User Account ---');
    const freeKhataBiz = await prisma.business.create({
      data: {
        name: `Test Free Khata Store ${runId}`,
        legalName: `Test Free Khata Store ${runId}`,
        tradeType: 'Personal Free Khata',
        email: `freekhata_${runId}@lendentest.com`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: freeKhataBiz.id,
        plan: SubscriptionPlan.FREE_KHATA,
        status: SubscriptionStatus.ACTIVE,
        monthlyPrice: 0,
        maxMonthlyInvoices: 0,
        maxStaffSeats: 1,
        trialDaysRemaining: 999999,
      },
    });

    const freeKhataEntitlements = await getBusinessEntitlements(freeKhataBiz.id);
    assert(freeKhataEntitlements.planKey === 'FREE_KHATA', 'Resolved planKey is FREE_KHATA');
    assert(freeKhataEntitlements.status === SubscriptionStatus.ACTIVE, 'Subscription status is ACTIVE');
    assert(!freeKhataEntitlements.isExpired, 'Free Khata never expires');
    assert(freeKhataEntitlements.entitlements.canAccessFreeKhata === true, 'canAccessFreeKhata is TRUE');
    assert(freeKhataEntitlements.entitlements.canCreateInvoices === false, 'canCreateInvoices is FALSE (commercial billing denied)');
    assert(freeKhataEntitlements.entitlements.canManagePurchases === false, 'canManagePurchases is FALSE (purchases denied)');
    assert(freeKhataEntitlements.entitlements.canManageSuppliers === false, 'canManageSuppliers is FALSE (suppliers denied)');
    assert(freeKhataEntitlements.entitlements.canManageStaff === false, 'canManageStaff is FALSE (staff denied)');
    assert(freeKhataEntitlements.entitlements.canMultiLocation === false, 'canMultiLocation is FALSE (multi-location denied)');
    assert(freeKhataEntitlements.entitlements.canAdvancedReports === false, 'canAdvancedReports is FALSE (advanced reports denied)');

    // ------------------------------------------------------------------------
    // 2. STARTER ACCOUNT TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing STARTER User Account ---');
    const starterBiz = await prisma.business.create({
      data: {
        name: `Test Starter Store ${runId}`,
        legalName: `Test Starter Store ${runId}`,
        tradeType: 'Retail',
        email: `starter_${runId}@lendentest.com`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: starterBiz.id,
        plan: SubscriptionPlan.STARTER,
        status: SubscriptionStatus.ACTIVE,
        monthlyPrice: 199,
        maxMonthlyInvoices: 999999,
        maxStaffSeats: 1,
        trialDaysRemaining: 0,
      },
    });

    const starterEntitlements = await getBusinessEntitlements(starterBiz.id);
    assert(starterEntitlements.planKey === 'STARTER', 'Resolved planKey is STARTER');
    assert(starterEntitlements.entitlements.canCreateInvoices === true, 'canCreateInvoices is TRUE');
    assert(starterEntitlements.limits.maxUsers === 1, 'maxUsers limit is 1 (owner only)');
    assert(starterEntitlements.limits.maxLocations === 1, 'maxLocations limit is 1');
    assert(starterEntitlements.entitlements.canManagePurchases === false, 'canManagePurchases is FALSE for Starter');
    assert(starterEntitlements.entitlements.canManageSuppliers === false, 'canManageSuppliers is FALSE for Starter');
    assert(starterEntitlements.entitlements.canManageStaff === false, 'canManageStaff is FALSE for Starter');
    assert(starterEntitlements.entitlements.canAdvancedReports === false, 'canAdvancedReports is FALSE for Starter');
    assert(starterEntitlements.entitlements.canMultiLocation === false, 'canMultiLocation is FALSE for Starter');

    // ------------------------------------------------------------------------
    // 3. GROWTH ACCOUNT TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing GROWTH User Account ---');
    const growthBiz = await prisma.business.create({
      data: {
        name: `Test Growth Store ${runId}`,
        legalName: `Test Growth Store ${runId}`,
        tradeType: 'Wholesale & Retail',
        email: `growth_${runId}@lendentest.com`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: growthBiz.id,
        plan: SubscriptionPlan.GROWTH_PRO,
        status: SubscriptionStatus.ACTIVE,
        monthlyPrice: 499,
        maxMonthlyInvoices: 999999,
        maxStaffSeats: 3,
        trialDaysRemaining: 0,
      },
    });

    const growthEntitlements = await getBusinessEntitlements(growthBiz.id);
    assert(growthEntitlements.planKey === 'GROWTH', 'Resolved planKey is GROWTH (normalized from GROWTH_PRO)');
    assert(growthEntitlements.entitlements.canCreateInvoices === true, 'canCreateInvoices is TRUE');
    assert(growthEntitlements.entitlements.canManagePurchases === true, 'canManagePurchases is TRUE');
    assert(growthEntitlements.entitlements.canManageSuppliers === true, 'canManageSuppliers is TRUE');
    assert(growthEntitlements.entitlements.canManageStaff === true, 'canManageStaff is TRUE');
    assert(growthEntitlements.entitlements.canAdvancedReports === true, 'canAdvancedReports is TRUE');
    assert(growthEntitlements.limits.maxUsers === 3, 'maxUsers limit is 3');
    assert(growthEntitlements.limits.maxLocations === 1, 'maxLocations limit is 1');
    assert(growthEntitlements.entitlements.canMultiLocation === false, 'canMultiLocation is FALSE for Growth');

    // ------------------------------------------------------------------------
    // 4. SCALE ACCOUNT TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing SCALE User Account ---');
    const scaleBiz = await prisma.business.create({
      data: {
        name: `Test Scale Store ${runId}`,
        legalName: `Test Scale Store ${runId}`,
        tradeType: 'Chain Distribution',
        email: `scale_${runId}@lendentest.com`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: scaleBiz.id,
        plan: SubscriptionPlan.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        monthlyPrice: 999,
        maxMonthlyInvoices: 999999,
        maxStaffSeats: 10,
        trialDaysRemaining: 0,
      },
    });

    const scaleEntitlements = await getBusinessEntitlements(scaleBiz.id);
    assert(scaleEntitlements.planKey === 'SCALE', 'Resolved planKey is SCALE (normalized from ENTERPRISE)');
    assert(scaleEntitlements.entitlements.canCreateInvoices === true, 'canCreateInvoices is TRUE');
    assert(scaleEntitlements.entitlements.canManagePurchases === true, 'canManagePurchases is TRUE');
    assert(scaleEntitlements.entitlements.canManageSuppliers === true, 'canManageSuppliers is TRUE');
    assert(scaleEntitlements.entitlements.canManageStaff === true, 'canManageStaff is TRUE');
    assert(scaleEntitlements.entitlements.canAdvancedReports === true, 'canAdvancedReports is TRUE');
    assert(scaleEntitlements.entitlements.canMultiLocation === true, 'canMultiLocation is TRUE for Scale');
    assert(scaleEntitlements.limits.maxUsers === 10, 'maxUsers limit is 10');
    assert(scaleEntitlements.limits.maxLocations === 3, 'maxLocations limit is 3');

    // ------------------------------------------------------------------------
    // 5. UNPAID / PENDING SUBSCRIPTION TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing UNPAID / PENDING Subscription (PAST_DUE) ---');
    const unpaidBiz = await prisma.business.create({
      data: {
        name: `Test Unpaid Store ${runId}`,
        legalName: `Test Unpaid Store ${runId}`,
        tradeType: 'Retail',
        email: `unpaid_${runId}@lendentest.com`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: unpaidBiz.id,
        plan: SubscriptionPlan.STARTER,
        status: SubscriptionStatus.PAST_DUE,
        monthlyPrice: 199,
      },
    });

    const unpaidEntitlements = await getBusinessEntitlements(unpaidBiz.id);
    assert(unpaidEntitlements.status === SubscriptionStatus.PAST_DUE, 'Status is PAST_DUE');
    assert(unpaidEntitlements.entitlements.canCreateInvoices === false, 'canCreateInvoices is FALSE for unpaid subscription');
    assert(unpaidEntitlements.entitlements.canManagePurchases === false, 'canManagePurchases is FALSE for unpaid subscription');

    // ------------------------------------------------------------------------
    // 6. EXPIRED / SUSPENDED SUBSCRIPTION TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing EXPIRED / SUSPENDED Subscription ---');
    const expiredBiz = await prisma.business.create({
      data: {
        name: `Test Expired Store ${runId}`,
        legalName: `Test Expired Store ${runId}`,
        tradeType: 'Retail',
        email: `expired_${runId}@lendentest.com`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: expiredBiz.id,
        plan: SubscriptionPlan.GROWTH_PRO,
        status: SubscriptionStatus.EXPIRED,
        monthlyPrice: 499,
      },
    });

    const expiredEntitlements = await getBusinessEntitlements(expiredBiz.id);
    assert(expiredEntitlements.isExpired === true, 'isExpired flag is TRUE');
    assert(expiredEntitlements.status === SubscriptionStatus.EXPIRED, 'Status is EXPIRED');
    assert(expiredEntitlements.entitlements.canCreateInvoices === false, 'canCreateInvoices is FALSE for expired subscription');
    assert(expiredEntitlements.entitlements.canManagePurchases === false, 'canManagePurchases is FALSE for expired subscription');
    assert(expiredEntitlements.entitlements.canManageStaff === false, 'canManageStaff is FALSE for expired subscription');

    // ------------------------------------------------------------------------
    // 7. STAFF USER ACCESS & PERMISSION TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing STAFF User Role Permissions ---');
    const staffOwner = await prisma.user.create({
      data: {
        name: `Owner ${runId}`,
        email: `owner_${runId}@lendentest.com`,
        passwordHash: 'dummy',
        platformRole: PlatformRole.USER,
      },
    });

    const billingStaff = await prisma.user.create({
      data: {
        name: `Billing Operator ${runId}`,
        email: `staff_${runId}@lendentest.com`,
        passwordHash: 'dummy',
        platformRole: PlatformRole.USER,
      },
    });

    const staffBiz = await prisma.business.create({
      data: {
        name: `Test Staff Store ${runId}`,
        legalName: `Test Staff Store ${runId}`,
        tradeType: 'Retail',
        email: `staffbiz_${runId}@lendentest.com`,
      },
    });

    await prisma.businessMembership.create({
      data: {
        userId: staffOwner.id,
        businessId: staffBiz.id,
        role: BusinessRole.BUSINESS_OWNER,
      },
    });

    const staffMembership = await prisma.businessMembership.create({
      data: {
        userId: billingStaff.id,
        businessId: staffBiz.id,
        role: BusinessRole.BILLING_STAFF,
      },
    });

    assert(staffMembership.role === BusinessRole.BILLING_STAFF, 'Staff role is BILLING_STAFF');
    assert(staffMembership.role !== BusinessRole.BUSINESS_OWNER, 'Staff is NOT Business Owner');

    // ------------------------------------------------------------------------
    // 8. SUPER ADMIN UNIVERSAL PRIVILEGE TEST
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Testing SUPER ADMIN Platform Access ---');
    const superAdmin = await prisma.user.create({
      data: {
        name: `Platform SuperAdmin ${runId}`,
        email: `superadmin_${runId}@lendentest.com`,
        passwordHash: 'dummy',
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });

    assert(superAdmin.platformRole === PlatformRole.SUPER_ADMIN, 'SuperAdmin platformRole is SUPER_ADMIN');

    // ------------------------------------------------------------------------
    // CLEANUP TEST DATA SAFELY
    // ------------------------------------------------------------------------
    console.log('\n--- Cleaning up temporary test workspaces safely ---');
    const testBizIds = [
      freeKhataBiz.id,
      starterBiz.id,
      growthBiz.id,
      scaleBiz.id,
      unpaidBiz.id,
      expiredBiz.id,
      staffBiz.id,
    ];

    await prisma.subscription.deleteMany({ where: { businessId: { in: testBizIds } } });
    await prisma.businessMembership.deleteMany({ where: { businessId: { in: testBizIds } } });
    await prisma.business.deleteMany({ where: { id: { in: testBizIds } } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [staffOwner.id, billingStaff.id, superAdmin.id] },
      },
    });
    console.log('  ✓ Test fixtures cleaned up successfully.');

    // ------------------------------------------------------------------------
    // FINAL SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n==================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
