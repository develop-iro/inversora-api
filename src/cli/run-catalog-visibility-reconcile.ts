import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CatalogVisibilityService } from '../modules/funds/services/catalog-visibility.service';
import { FundsRepository } from '../modules/funds/repositories/funds.repository';

const logger = new Logger('RunCatalogVisibilityReconcileCli');

/**
 * Re-applies automatic catalog visibility rules to all persisted funds.
 */
async function runCatalogVisibilityReconcileCli(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fundsRepository = app.get(FundsRepository);
    const catalogVisibilityService = app.get(CatalogVisibilityService);
    const funds = await fundsRepository.findAll();
    let updated = 0;

    for (const fund of funds) {
      const next =
        await catalogVisibilityService.applyAutomaticVisibilityRules(fund);

      if (next.catalogVisibility !== fund.catalogVisibility) {
        updated += 1;
      }
    }

    process.stdout.write(
      `${JSON.stringify({ total: funds.length, updated }, null, 2)}\n`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Catalog visibility reconcile failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void runCatalogVisibilityReconcileCli();
