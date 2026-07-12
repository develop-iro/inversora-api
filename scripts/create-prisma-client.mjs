import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL =
  'postgresql://inversora:inversora@localhost:5432/inversora';

/**
 * Creates a Prisma Client for CLI scripts using the PostgreSQL driver adapter.
 *
 * @param {string | undefined} connectionString - Optional override for `DATABASE_URL`.
 * @returns {PrismaClient} Configured Prisma client instance.
 */
export function createPrismaClient(
  connectionString = process.env.DATABASE_URL,
) {
  const url = connectionString ?? DEFAULT_DATABASE_URL;

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
}
