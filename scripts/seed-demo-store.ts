import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { registerBusinessOwner } from '../src/lib/auth/service';

async function main() {
  const email = 'owner@laxmistores.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Demo user already exists:', existing.email);
    return;
  }

  const result = await registerBusinessOwner({
    name: 'Rajesh Verma',
    email,
    password: 'Password123!',
    phone: '9876543210',
    businessName: 'Laxmi Kirana & General Store',
    city: 'Raipur',
    state: 'Chhattisgarh',
    gstin: '22AAAAA0000A1Z5',
  });

  console.log('SUCCESS: Demo store registered!', result.user.email, result.business.name);
}

main()
  .catch((e) => console.error('Failed:', e))
  .finally(() => prisma.$disconnect());
