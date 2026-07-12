import {
  createPrismaClient,
  createPrismaClientOptions,
  resolvePrismaDatabaseUrl,
} from './create-prisma-client';

describe('createPrismaClient', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('resolves DATABASE_URL from the environment when present', () => {
    process.env.DATABASE_URL = 'postgresql://custom/db';

    expect(resolvePrismaDatabaseUrl()).toBe('postgresql://custom/db');
  });

  it('falls back to the local default when DATABASE_URL is unset', () => {
    delete process.env.DATABASE_URL;

    expect(resolvePrismaDatabaseUrl()).toBe(
      'postgresql://inversora:inversora@localhost:5432/inversora',
    );
  });

  it('builds Prisma Client options with a PostgreSQL adapter', () => {
    expect(createPrismaClientOptions().adapter).toBeDefined();
  });

  it('creates a Prisma Client with an optional connection override', () => {
    const client = createPrismaClient(
      'postgresql://override:inversora@localhost:5432/inversora',
    );

    expect(client).toBeDefined();
  });

  it('creates a Prisma Client with the resolved connection string', () => {
    process.env.DATABASE_URL =
      'postgresql://resolved:inversora@localhost:5432/inversora';

    expect(createPrismaClient()).toBeDefined();
  });
});
