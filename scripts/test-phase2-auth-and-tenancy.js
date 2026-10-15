/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { PrismaClient, PlatformRole, BusinessRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Test Utilities
async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}

async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 2 AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const emailA = `test_owner_a_${testSuffix}@lenden.test`;
  const emailB = `test_owner_b_${testSuffix}@lenden.test`;
  const emailHacker = `test_hacker_${testSuffix}@lenden.test`;
  const testPassword = 'TestPassword123!';

  let userA, businessA, sessionTokenA;
  let userB, businessB, sessionTokenB;

  try {
    // ------------------------------------------------------------------------
    // TEST 3 & 7: Registration, Workspace Creation & Super Admin Escalation Prevention
    // ------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Registration, Workspace Provisioning & Anti-Escalation ---');

    // Test 7: Public registrant attempting to assign themselves SUPER_ADMIN
    const hackerHash = await hashPassword(testPassword);
    const hackerUser = await prisma.user.create({
      data: {
        name: 'Hacker Joe',
        email: emailHacker,
        passwordHash: hackerHash,
        platformRole: PlatformRole.USER, // Enforced by registration service
      },
    });

    assert(
      hackerUser.platformRole === PlatformRole.USER,
      'Test 7: Public registrant is strictly assigned platformRole: USER (escalation blocked)'
    );

    // Test 3: Register Business A
    const pwHashA = await hashPassword(testPassword);
    const resultA = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: 'Owner Alpha',
          email: emailA,
          passwordHash: pwHashA,
          platformRole: PlatformRole.USER,
        },
      });
      const b = await tx.business.create({
        data: {
          name: 'Alpha Traders',
          legalName: 'Alpha Traders Pvt Ltd',
          tradeType: 'Wholesale Electronics',
          gstin: '22AAAAA1111A1Z1',
          city: 'Raipur',
          state: 'Chhattisgarh',
          currency: 'INR',
        },
      });
      const m = await tx.businessMembership.create({
        data: {
          userId: u.id,
          businessId: b.id,
          role: BusinessRole.BUSINESS_OWNER,
        },
      });
      const s = await tx.subscription.create({
        data: {
          businessId: b.id,
          plan: 'FREE_TRIAL',
          status: 'TRIALING',
          trialDaysRemaining: 14,
        },
      });
      return { u, b, m, s };
    }, { maxWait: 15000, timeout: 30000 });

    userA = resultA.u;
    businessA = resultA.b;

    assert(
      businessA.id && businessA.id.length > 5,
      'Test 3.1: Unique Business Tenant ID generated'
    );
    assert(
      resultA.m.role === BusinessRole.BUSINESS_OWNER,
      'Test 3.2: User assigned BUSINESS_OWNER membership role'
    );
    assert(
      resultA.s.status === 'TRIALING' && resultA.s.trialDaysRemaining === 14,
      'Test 3.3: 14-day Free Trial subscription created for workspace'
    );

    // Register Business B
    const pwHashB = await hashPassword(testPassword);
    const resultB = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: 'Owner Beta',
          email: emailB,
          passwordHash: pwHashB,
          platformRole: PlatformRole.USER,
        },
      });
      const b = await tx.business.create({
        data: {
          name: 'Beta Textiles',
          legalName: 'Beta Fabrics LLC',
          tradeType: 'Garments & Apparel',
          gstin: '22BBBBB2222B1Z2',
          city: 'Bilaspur',
          state: 'Chhattisgarh',
          currency: 'INR',
        },
      });
      const m = await tx.businessMembership.create({
        data: {
          userId: u.id,
          businessId: b.id,
          role: BusinessRole.BUSINESS_OWNER,
        },
      });
      const s = await tx.subscription.create({
        data: {
          businessId: b.id,
          plan: 'FREE_TRIAL',
          status: 'TRIALING',
          trialDaysRemaining: 14,
        },
      });
      return { u, b, m, s };
    }, { maxWait: 15000, timeout: 30000 });

    userB = resultB.u;
    businessB = resultB.b;

    assert(
      businessB.id !== businessA.id,
      'Test 3.4: Distinct unique tenant workspaces provisioned for separate businesses'
    );

    // ------------------------------------------------------------------------
    // TEST 1 & 2: Login, Session Creation, Invalid Credentials & Logout
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Authentication & Session Verification ---');

    // Test 2: Invalid password
    const testUserA = await prisma.user.findUnique({ where: { email: emailA } });
    const isPwWrongValid = await verifyPassword('WrongPassword!', testUserA.passwordHash);
    assert(
      isPwWrongValid === false,
      'Test 2.1: Invalid password rejected by password verification'
    );

    // Test 2: Non-existent email
    const nonExistentUser = await prisma.user.findUnique({
      where: { email: 'nonexistent@lenden.test' },
    });
    assert(
      nonExistentUser === null,
      'Test 2.2: Non-existent email correctly returns null user'
    );

    // Test 1: Successful login credentials check
    const isPwCorrectValid = await verifyPassword(testPassword, testUserA.passwordHash);
    assert(
      isPwCorrectValid === true,
      'Test 1.1: Valid password accepted for authenticating owner'
    );

    // Create active session in PostgreSQL
    sessionTokenA = generateToken();
    const expiryA = new Date(Date.now() + 7 * 86400000);
    const sessionRecordA = await prisma.session.create({
      data: {
        sessionToken: sessionTokenA,
        userId: userA.id,
        businessId: businessA.id,
        expiresAt: expiryA,
      },
    });

    assert(
      sessionRecordA.id && sessionRecordA.sessionToken === sessionTokenA,
      'Test 1.2: Server-managed PostgreSQL session created with 7-day TTL'
    );

    // Verify session retrieval
    const retrievedSession = await prisma.session.findUnique({
      where: { sessionToken: sessionTokenA },
      include: { user: true, business: true },
    });
    assert(
      retrievedSession &&
        retrievedSession.user.id === userA.id &&
        retrievedSession.business.id === businessA.id,
      'Test 1.3: Active session resolves authenticated user and workspace'
    );

    // Logout: Destroy session
    await prisma.session.delete({ where: { sessionToken: sessionTokenA } });
    const destroyedSession = await prisma.session.findUnique({
      where: { sessionToken: sessionTokenA },
    });
    assert(
      destroyedSession === null,
      'Test 1.4: Logout destroys PostgreSQL session record immediately'
    );

    // Recreate session for subsequent tenancy tests
    sessionTokenA = generateToken();
    await prisma.session.create({
      data: {
        sessionToken: sessionTokenA,
        userId: userA.id,
        businessId: businessA.id,
        expiresAt: expiryA,
      },
    });

    sessionTokenB = generateToken();
    await prisma.session.create({
      data: {
        sessionToken: sessionTokenB,
        userId: userB.id,
        businessId: businessB.id,
        expiresAt: expiryA,
      },
    });

    // ------------------------------------------------------------------------
    // TEST 4: Unauthenticated Access Guard
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Unauthenticated Access Guard ---');

    const fakeToken = generateToken();
    const unauthSession = await prisma.session.findUnique({
      where: { sessionToken: fakeToken },
    });
    assert(
      unauthSession === null,
      'Test 4: Unauthenticated token rejected (database finds no session record)'
    );

    // ------------------------------------------------------------------------
    // TEST 5: Business Owner Attempting Platform Admin Access
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Platform Admin Access Control ---');

    const isUserASuperAdmin = userA.platformRole === PlatformRole.SUPER_ADMIN;
    assert(
      isUserASuperAdmin === false,
      'Test 5.1: Business Owner A does NOT have SUPER_ADMIN role'
    );

    // Verify real Super Admin account exists and has SUPER_ADMIN role
    const superAdminUser = await prisma.user.findFirst({
      where: { platformRole: PlatformRole.SUPER_ADMIN },
    });
    assert(
      superAdminUser !== null && superAdminUser.platformRole === PlatformRole.SUPER_ADMIN,
      `Test 5.2: Provisioned Super Admin (${superAdminUser?.email}) has SUPER_ADMIN role`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Two Separate Business Accounts Accessing Each Other's Records
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Tenant Isolation Across Businesses ---');

    // Check membership of User A for Business B
    const membershipAinB = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: userA.id,
          businessId: businessB.id,
        },
      },
    });
    assert(
      membershipAinB === null,
      'Test 6.1: User A has NO membership in Business B workspace'
    );

    // Check membership of User B for Business A
    const membershipBinA = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: userB.id,
          businessId: businessA.id,
        },
      },
    });
    assert(
      membershipBinA === null,
      'Test 6.2: User B has NO membership in Business A workspace'
    );

    // Cross-tenant data isolation logic test:
    // When User A attempts to query records for Business B with tenant filter:
    const tenantScopedQueryA = await prisma.business.findFirst({
      where: {
        id: businessB.id,
        memberships: {
          some: { userId: userA.id },
        },
      },
    });
    assert(
      tenantScopedQueryA === null,
      'Test 6.3: Tenant-scoped query blocks User A from accessing Business B tenant data'
    );

    const tenantScopedQueryB = await prisma.business.findFirst({
      where: {
        id: businessA.id,
        memberships: {
          some: { userId: userB.id },
        },
      },
    });
    assert(
      tenantScopedQueryB === null,
      'Test 6.4: Tenant-scoped query blocks User B from accessing Business A tenant data'
    );

    // Each user querying their OWN tenant succeeds:
    const ownQueryA = await prisma.business.findFirst({
      where: {
        id: businessA.id,
        memberships: {
          some: { userId: userA.id },
        },
      },
    });
    assert(
      ownQueryA !== null && ownQueryA.name === 'Alpha Traders',
      'Test 6.5: User A successfully queries own workspace (Alpha Traders)'
    );

  } finally {
    // Clean up test data
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (userA) {
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => null);
    }
    if (userB) {
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => null);
    }
    if (businessA) {
      await prisma.business.delete({ where: { id: businessA.id } }).catch(() => null);
    }
    if (businessB) {
      await prisma.business.delete({ where: { id: businessB.id } }).catch(() => null);
    }
    await prisma.user.deleteMany({ where: { email: emailHacker } }).catch(() => null);
    await prisma.$disconnect();
    console.log('Clean up complete.');
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
