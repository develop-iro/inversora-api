import {
  createPrismaClient,
  createPrismaClientOptions,
  resolvePrismaDatabaseUrl,
} from './create-prisma-client';

const originalDatabaseUrl = process.env.DATABASE_URL;

describe('create-prisma-client', () => {
  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('resolves the local default database url when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;

    expect(resolvePrismaDatabaseUrl()).toBe(
      'postgresql://inversora:inversora@localhost:5432/inversora',
    );
  });

  it('uses DATABASE_URL when present', () => {
    process.env.DATABASE_URL = 'postgresql://ci-host/inversora';

    expect(resolvePrismaDatabaseUrl()).toBe('postgresql://ci-host/inversora');
  });

  it('builds Prisma Client options with a PostgreSQL adapter', () => {
    process.env.DATABASE_URL = 'postgresql://adapter-host/inversora';

    expect(
      Object.prototype.hasOwnProperty.call(
        createPrismaClientOptions(),
        'adapter',
      ),
    ).toBe(true);
  });

  it('creates a Prisma Client with the resolved database url', async () => {
    process.env.DATABASE_URL = 'postgresql://resolved-host/inversora';

    const client = createPrismaClient();

    expect(typeof client.$connect).toBe('function');
    await client.$disconnect();
  });

  it('creates a Prisma Client with a connection string override', async () => {
    const client = createPrismaClient('postgresql://override-host/inversora');

    expect(typeof client.$connect).toBe('function');
    await client.$disconnect();
  });
});
