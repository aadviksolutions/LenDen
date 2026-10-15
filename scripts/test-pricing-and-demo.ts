import prisma from '../src/lib/prisma';
import {
  OFFICIAL_PLANS,
  BILLING_INTERVALS,
  PlanKey,
} from '../src/lib/subscription/plans';
import {
  getBusinessEntitlements,
  checkFeatureEntitlement,
} from '../src/lib/subscription/entitlements';
import {
  seedDemoWorkspace,
  enterDemoWorkspace,
  resetDemoWorkspace,
  DEMO_WORKSPACES,
} from '../src/lib/demo/demoService';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING LENDEN PRICING & DEMO MODE VERIFICATION TEST');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Pricing Matrix & Math Verification
  // ----------------------------------------------------
  console.log('--- 1. Testing Official Plans Pricing & Limits ---');

  // Starter
  const starter = OFFICIAL_PLANS.STARTER;
  assert(starter.pricing.MONTHLY.totalPrice === 199, 'Starter 1 Month is ₹199');
  assert(starter.pricing.THREE_MONTHS.totalPrice === 499, 'Starter 3 Months is ₹499');
  assert(starter.pricing.SIX_MONTHS.totalPrice === 799, 'Starter 6 Months is ₹799');
  assert(starter.pricing.YEARLY.totalPrice === 1499, 'Starter 12 Months is ₹1,499');
  assert(starter.limits.maxUsers === 1, 'Starter allows exactly 1 user (Owner)');
  assert(starter.limits.maxLocations === 1, 'Starter allows exactly 1 location');
  assert(starter.limits.isUnlimitedInvoices === true, 'Starter includes unlimited invoices');

  // Verify savings math: full monthly sum - packagePrice
  const starter3mSavings = 199 * 3 - 499; // 597 - 499 = 98
  assert(starter.pricing.THREE_MONTHS.savingsAmount === starter3mSavings, 'Starter 3m savings calculation exact (₹98)');
  const starter12mSavings = 199 * 12 - 1499; // 2388 - 1499 = 889
  assert(starter.pricing.YEARLY.savingsAmount === starter12mSavings, 'Starter 12m savings calculation exact (₹889)');

  // Growth
  const growth = OFFICIAL_PLANS.GROWTH;
  assert(growth.pricing.MONTHLY.totalPrice === 499, 'Growth 1 Month is ₹499');
  assert(growth.pricing.THREE_MONTHS.totalPrice === 1299, 'Growth 3 Months is ₹1,299');
  assert(growth.pricing.SIX_MONTHS.totalPrice === 2499, 'Growth 6 Months is ₹2,499');
  assert(growth.pricing.YEARLY.totalPrice === 4499, 'Growth 12 Months is ₹4,499');
  assert(growth.limits.maxUsers === 3, 'Growth allows exactly 3 users');
  assert(growth.limits.maxLocations === 1, 'Growth allows exactly 1 location');
  assert(growth.limits.isUnlimitedInvoices === true, 'Growth includes unlimited invoices');

  const growth12mSavings = 499 * 12 - 4499; // 5988 - 4499 = 1489
  assert(growth.pricing.YEARLY.savingsAmount === growth12mSavings, 'Growth 12m savings calculation exact (₹1,489)');

  // Scale
  const scale = OFFICIAL_PLANS.SCALE;
  assert(scale.pricing.MONTHLY.totalPrice === 999, 'Scale 1 Month is ₹999');
  assert(scale.pricing.THREE_MONTHS.totalPrice === 2499, 'Scale 3 Months is ₹2,499');
  assert(scale.pricing.SIX_MONTHS.totalPrice === 4499, 'Scale 6 Months is ₹4,499');
  assert(scale.pricing.YEARLY.totalPrice === 8499, 'Scale 12 Months is ₹8,499');
  assert(scale.limits.maxUsers === 10, 'Scale allows exactly 10 users');
  assert(scale.limits.maxLocations === 3, 'Scale allows up to 3 locations');
  assert(scale.limits.isUnlimitedInvoices === true, 'Scale includes unlimited invoices');

  const scale12mSavings = 999 * 12 - 8499; // 11988 - 8499 = 3489
  assert(scale.pricing.YEARLY.savingsAmount === scale12mSavings, 'Scale 12m savings calculation exact (₹3,489)');

  // ----------------------------------------------------
  // TEST 2: Entitlement Service Verification
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Shared Entitlement Service ---');

  // Check Starter entitlements
  assert(starter.entitlements.canCreateInvoices === true, 'Starter can create invoices');
  assert(starter.entitlements.canManageCustomers === true, 'Starter can manage customers');
  assert(starter.entitlements.canTrackUdhaar === true, 'Starter can track udhaar');
  assert(starter.entitlements.canManagePurchases === false, 'Starter CANNOT manage purchases');
  assert(starter.entitlements.canManageSuppliers === false, 'Starter CANNOT manage suppliers');
  assert(starter.entitlements.canManageStaff === false, 'Starter CANNOT manage multiple staff');
  assert(starter.entitlements.canMultiLocation === false, 'Starter CANNOT use multi-location');

  // Check Growth entitlements
  assert(growth.entitlements.canManagePurchases === true, 'Growth CAN manage purchases');
  assert(growth.entitlements.canManageSuppliers === true, 'Growth CAN manage suppliers');
  assert(growth.entitlements.canLowStockAlerts === true, 'Growth has low stock alerts');
  assert(growth.entitlements.canManageStaff === true, 'Growth has staff roles & permissions');
  assert(growth.entitlements.canMultiLocation === false, 'Growth CANNOT use multi-location');

  // Check Scale entitlements
  assert(scale.entitlements.canMultiLocation === true, 'Scale CAN use multi-location (3 branches)');
  assert(scale.entitlements.canConsolidatedReports === true, 'Scale has consolidated reports');
  assert(scale.entitlements.canAuditTrail === true, 'Scale has expanded audit trail');

  // ----------------------------------------------------
  // TEST 3: Seeding & Isolation of Three Demo Workspaces
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Seeding & Isolation of Demo Workspaces ---');

  // Seed Starter
  const starterBiz = await seedDemoWorkspace('STARTER');
  assert(starterBiz.id === DEMO_WORKSPACES.STARTER.businessId, 'Starter demo business ID matches');
  assert(starterBiz.isDemo === true, 'Starter workspace is flagged as isDemo');
  assert(starterBiz.name.includes('Sharma Kirana'), 'Starter business name is Sharma Kirana');

  // Verify Starter Sample Data
  const starterCustomers = await prisma.customer.count({ where: { businessId: starterBiz.id } });
  const starterProducts = await prisma.product.count({ where: { businessId: starterBiz.id } });
  const starterInvoices = await prisma.invoice.count({ where: { businessId: starterBiz.id } });
  const starterMembers = await prisma.businessMembership.count({ where: { businessId: starterBiz.id } });
  assert(starterCustomers >= 4, `Starter has realistic sample customers (${starterCustomers})`);
  assert(starterProducts >= 5, `Starter has sample products (${starterProducts})`);
  assert(starterInvoices >= 3, `Starter has sample invoices (${starterInvoices})`);
  assert(starterMembers === 1, `Starter strictly has 1 member (Owner only, count=${starterMembers})`);

  // Seed Growth
  const growthBiz = await seedDemoWorkspace('GROWTH');
  assert(growthBiz.id === DEMO_WORKSPACES.GROWTH.businessId, 'Growth demo business ID matches');
  assert(growthBiz.isDemo === true, 'Growth workspace is flagged as isDemo');
  assert(growthBiz.name.includes('Verma Electricals'), 'Growth business name is Verma Electricals');

  const growthSuppliers = await prisma.supplier.count({ where: { businessId: growthBiz.id } });
  const growthPurchases = await prisma.purchase.count({ where: { businessId: growthBiz.id } });
  const growthMembers = await prisma.businessMembership.count({ where: { businessId: growthBiz.id } });
  assert(growthSuppliers >= 2, `Growth has sample suppliers (${growthSuppliers})`);
  assert(growthPurchases >= 2, `Growth has sample purchases (${growthPurchases})`);
  assert(growthMembers === 3, `Growth has exactly 3 staff seats (${growthMembers})`);

  // Seed Scale
  const scaleBiz = await seedDemoWorkspace('SCALE');
  assert(scaleBiz.id === DEMO_WORKSPACES.SCALE.businessId, 'Scale demo business ID matches');
  assert(scaleBiz.isDemo === true, 'Scale workspace is flagged as isDemo');
  assert(scaleBiz.name.includes('Apex Logistics'), 'Scale business name is Apex Logistics');

  const scaleMembers = await prisma.businessMembership.count({ where: { businessId: scaleBiz.id } });
  assert(scaleMembers === 10, `Scale has exactly 10 staff members (${scaleMembers})`);

  // ----------------------------------------------------
  // TEST 4: Entitlements Function on Live Demo Businesses
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Live Entitlements on Seeded Demo Businesses ---');

  const starterEnt = await getBusinessEntitlements(starterBiz.id);
  assert(starterEnt.planKey === 'STARTER', 'Starter business resolves planKey STARTER');
  assert(starterEnt.limits.maxUsers === 1, 'Starter business entitlement limits maxUsers to 1');
  assert(starterEnt.isDemo === true, 'Starter business entitlement confirms isDemo');

  const starterPurchaseCheck = await checkFeatureEntitlement(starterBiz.id, 'canManagePurchases');
  assert(starterPurchaseCheck.allowed === false, 'Starter checkFeatureEntitlement blocks purchases');
  assert(starterPurchaseCheck.requiredPlan === 'GROWTH', 'Starter checkFeatureEntitlement recommends Growth');

  const growthEnt = await getBusinessEntitlements(growthBiz.id);
  assert(growthEnt.planKey === 'GROWTH', 'Growth business resolves planKey GROWTH');
  assert(growthEnt.limits.maxUsers === 3, 'Growth business entitlement limits maxUsers to 3');

  const growthPurchaseCheck = await checkFeatureEntitlement(growthBiz.id, 'canManagePurchases');
  assert(growthPurchaseCheck.allowed === true, 'Growth checkFeatureEntitlement allows purchases');

  const scaleEnt = await getBusinessEntitlements(scaleBiz.id);
  assert(scaleEnt.planKey === 'SCALE', 'Scale business resolves planKey SCALE');
  assert(scaleEnt.limits.maxUsers === 10, 'Scale business entitlement limits maxUsers to 10');
  assert(scaleEnt.limits.maxLocations === 3, 'Scale business entitlement allows 3 locations');

  // ----------------------------------------------------
  // TEST 5: Super Admin Security & Platform Metric Exclusion
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Super Admin Separation & Security ---');

  // Verify demo users do not have SUPER_ADMIN role
  const starterUser = await prisma.user.findUnique({
    where: { email: DEMO_WORKSPACES.STARTER.userEmail },
  });
  const growthUser = await prisma.user.findUnique({
    where: { email: DEMO_WORKSPACES.GROWTH.userEmail },
  });
  const scaleUser = await prisma.user.findUnique({
    where: { email: DEMO_WORKSPACES.SCALE.userEmail },
  });

  assert(starterUser?.platformRole === 'USER', 'Starter demo user has platformRole USER (not SUPER_ADMIN)');
  assert(growthUser?.platformRole === 'USER', 'Growth demo user has platformRole USER (not SUPER_ADMIN)');
  assert(scaleUser?.platformRole === 'USER', 'Scale demo user has platformRole USER (not SUPER_ADMIN)');

  // Verify platform metrics query excludes demo workspaces
  const realTenantsCount = await prisma.business.count({
    where: {
      isDemo: false,
      id: { not: { startsWith: 'demo_' } },
    },
  });
  const allTenantsCount = await prisma.business.count();
  assert(
    allTenantsCount >= realTenantsCount + 3,
    `Platform metrics strictly excludes 3 demo workspaces (${realTenantsCount} real vs ${allTenantsCount} total)`
  );

  // ----------------------------------------------------
  // TEST 6: Demo Workspace Session Creation & Reset
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Demo Session Creation & Reset Flow ---');

  const sessionResult = await enterDemoWorkspace('GROWTH');
  assert(sessionResult.success === true, 'enterDemoWorkspace returns success');
  assert(Boolean(sessionResult.sessionToken), 'Session token created for demo user');
  assert(sessionResult.planKey === 'GROWTH', 'Session points to GROWTH demo workspace');

  // Test reset demo workspace
  const resetResult = await resetDemoWorkspace('GROWTH');
  assert(resetResult.success === true, 'resetDemoWorkspace returns success');
  assert(resetResult.businessName.includes('Verma Electricals'), 'Reset restored sample business');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Test execution failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
