import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('Prisma connection to PostgreSQL validated.');
} catch (error) {
  console.error('Failed to validate Prisma connection to PostgreSQL.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
