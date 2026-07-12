import { getDatabaseHostLabel, loadProjectEnv } from './load-project-env.mjs';
import { createPrismaClient } from './create-prisma-client.mjs';

loadProjectEnv();

const prisma = createPrismaClient();

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
