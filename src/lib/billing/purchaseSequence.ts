import { Prisma, PrismaClient } from '@prisma/client';
import { getFiscalYear } from './sequence';

/**
 * Concurrency-safe sequential purchase number generator (e.g. "PUR-2026-27-0001").
 * Operates on Prisma Client or inside a Prisma transaction, performing an atomic update/increment
 * on the business's PurchaseSequence record.
 */
export async function generatePurchaseNumber(
  client: Prisma.TransactionClient | PrismaClient,
  businessId: string,
  prefix = 'PUR'
): Promise<string> {
  const fiscalYear = getFiscalYear();

  const sequence = await client.purchaseSequence.upsert({
    where: { businessId },
    update: {
      currentNumber: {
        increment: 1,
      },
      fiscalYear,
    },
    create: {
      businessId,
      prefix,
      fiscalYear,
      currentNumber: 1,
    },
  });

  const paddedNum = String(sequence.currentNumber).padStart(4, '0');
  return `${prefix}-${fiscalYear}-${paddedNum}`;
}
