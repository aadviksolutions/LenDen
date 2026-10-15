/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { PrismaClient, PlatformRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || 'Lenden Super Admin';

  if (!email || !password) {
    console.error(
      'Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in your environment.'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: SUPER_ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`Provisioning Super Admin user: ${email}...`);
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      platformRole: PlatformRole.SUPER_ADMIN,
    },
    create: {
      email,
      name,
      passwordHash,
      platformRole: PlatformRole.SUPER_ADMIN,
    },
  });

  console.log(`✓ Super Admin provisioned successfully! ID: ${admin.id}, Email: ${admin.email}, Role: ${admin.platformRole}`);
}

main()
  .catch((e) => {
    console.error('Failed to provision Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
