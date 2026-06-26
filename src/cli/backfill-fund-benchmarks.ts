import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { resolveFundBenchmark } from '../modules/providers/financial-modeling-prep/financial-modeling-prep.normalizers';
import { CatalogVisibilityService } from '../modules/funds/services/catalog-visibility.service';
import { FundsRepository } from '../modules/funds/repositories/funds.repository';
import { PrismaService } from '../shared/database/prisma.service';

const logger = new Logger('BackfillFundBenchmarksCli');

/**
 * Backfills missing fund benchmarks from persisted names and re-applies visibility.
 */
async function backfillFundBenchmarksCli(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const fundsRepository = app.get(FundsRepository);
    const catalogVisibilityService = app.get(CatalogVisibilityService);
    const funds = await fundsRepository.findAll();
    let updatedBenchmarks = 0;
    let visibilityPromoted = 0;

    for (const fund of funds) {
      const currentBenchmark = fund.benchmark?.trim() ?? '';
      const nextBenchmark =
        currentBenchmark.length > 0
          ? currentBenchmark
          : resolveFundBenchmark(fund.name);

      if (nextBenchmark !== currentBenchmark) {
        await prisma.fund.update({
          where: { id: fund.id },
          data: { benchmark: nextBenchmark },
        });
        updatedBenchmarks += 1;
      }

      const refreshed = await fundsRepository.findById(fund.id);

      if (refreshed === null) {
        continue;
      }

      const withVisibility =
        await catalogVisibilityService.applyAutomaticVisibilityRules(refreshed);

      if (
        fund.catalogVisibility !== 'visible' &&
        withVisibility.catalogVisibility === 'visible'
      ) {
        visibilityPromoted += 1;
      }
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          total: funds.length,
          updatedBenchmarks,
          visibilityPromoted,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Benchmark backfill failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void backfillFundBenchmarksCli();
