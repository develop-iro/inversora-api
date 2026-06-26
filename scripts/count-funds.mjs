import { PrismaClient } from '@prisma/client';
import { getDatabaseHostLabel, loadProjectEnv } from './load-project-env.mjs';

loadProjectEnv();

const prisma = new PrismaClient();

try {
  const groups = await prisma.fund.groupBy({
    by: ['catalogVisibility'],
    _count: { _all: true },
  });
  const total = await prisma.fund.count();

  console.log(
    JSON.stringify(
      {
        databaseHost: getDatabaseHostLabel(),
        total,
        groups,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
