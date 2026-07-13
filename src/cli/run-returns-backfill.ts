import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { isCatalogVisible } from '../modules/funds/entities/catalog-visibility.schema';
import { FundsRepository } from '../modules/funds/repositories/funds.repository';
import { FundMaterializedReturnsService } from '../modules/funds/services/fund-materialized-returns.service';

const logger = new Logger('RunReturnsBackfillCli');

/**
 * Backfills materialized return columns for persisted funds from stored prices.
 */
async function runReturnsBackfillCli(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const visibleOnly = process.argv.includes('--visible-only');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fundsRepository = app.get(FundsRepository);
    const materializedReturnsService = app.get(FundMaterializedReturnsService);
    const funds = await fundsRepository.findAll();
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const fund of funds) {
      if (visibleOnly && !isCatalogVisible(fund)) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        processed += 1;
        continue;
      }

      try {
        await materializedReturnsService.refreshForFundId(fund.id);
        processed += 1;
      } catch (error) {
        failed += 1;
        logger.warn(
          `Failed to backfill returns for ${fund.symbol} (${fund.id}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          dryRun,
          visibleOnly,
          total: funds.length,
          processed,
          skipped,
          failed,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await app.close();
  }
}

runReturnsBackfillCli().catch((error: unknown) => {
  logger.error(
    error instanceof Error ? error.message : 'Returns backfill failed',
  );
  process.exitCode = 1;
});
