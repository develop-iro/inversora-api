import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL =
  'postgresql://inversora:inversora@localhost:5432/inversora';

type PrismaClientConstructorOptions = ConstructorParameters<
  typeof PrismaClient
>[0];

/**
 * Resolves the PostgreSQL connection string used by Prisma driver adapters.
 */
export function resolvePrismaDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

/**
 * Builds Prisma Client options for PostgreSQL using the official pg adapter.
 */
export function createPrismaClientOptions(): PrismaClientConstructorOptions {
  return {
    adapter: new PrismaPg({
      connectionString: resolvePrismaDatabaseUrl(),
    }),
  };
}

/**
 * Creates a Prisma Client configured for PostgreSQL via `@prisma/adapter-pg`.
 *
 * @param connectionString - Optional override for `DATABASE_URL`.
 */
export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? resolvePrismaDatabaseUrl();

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
}
