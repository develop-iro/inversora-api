import { getDatabaseHostLabel, loadProjectEnv } from './load-project-env.mjs';
import { createPrismaClient } from './create-prisma-client.mjs';

loadProjectEnv();

const prisma = createPrismaClient();

try {
  const [total, visible, quarantined, blocked] = await Promise.all([
    prisma.fund.count(),
    prisma.fund.count({ where: { catalogVisibility: 'VISIBLE' } }),
    prisma.fund.count({ where: { catalogVisibility: 'QUARANTINED' } }),
    prisma.fund.count({ where: { catalogVisibility: 'BLOCKED' } }),
  ]);

  const [noScore, noTer, noIsin, noBenchmark, withPrices] = await Promise.all([
    prisma.fund.count({ where: { score: null } }),
    prisma.fund.count({ where: { ter: null } }),
    prisma.fund.count({ where: { isin: null } }),
    prisma.fund.count({
      where: { OR: [{ benchmark: null }, { benchmark: '' }] },
    }),
    prisma.fundPrice
      .groupBy({
        by: ['fundId'],
        _count: { _all: true },
      })
      .then((rows) => rows.length),
  ]);

  console.log(
    JSON.stringify(
      {
        databaseHost: getDatabaseHostLabel(),
        total,
        visible,
        quarantined,
        blocked,
        gaps: {
          noScore,
          noTer,
          noIsin,
          noBenchmark,
          fundsWithAnyPrice: withPrices,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
