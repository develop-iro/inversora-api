import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FundDailySyncService } from '../modules/funds/services/fund-daily-sync.service';
import { PrismaService } from '../shared/database/prisma.service';
import {
  DEFAULT_METADATA_BATCH_SIZE,
  DEFAULT_SYNC_BATCH_PAUSE_MS,
  DEFAULT_SYNC_BATCH_SIZE,
  FMP_CALLS_PER_MINUTE,
  loadAllFundSymbols,
  loadUsSymbolsMissingPrices,
  parseCliNonNegativeInt,
  parseCliPositiveInt,
  readCliRequiredValue,
  runBatchedFundSyncPhase,
  runNestCli,
} from './fund-sync-batch.utils';

const logger = new Logger('RunProductionSyncCli');

/** Parsed CLI options for the production sync pipeline. */
type ProductionSyncCliOptions = {
  readonly metadataBatchSize: number;
  readonly priceBatchSize: number;
  readonly pauseMs: number;
  readonly maxBatches: number | null;
  readonly metadataStartBatch: number;
  readonly priceStartBatch: number;
  readonly dryRun: boolean;
  readonly skipMetadata: boolean;
  readonly skipPrices: boolean;
  readonly skipPostProcessing: boolean;
};

/**
 * Runs the full production data pipeline: metadata, prices, themes, benchmarks,
 * catalog visibility, and scoring.
 */
async function runProductionSyncCli(): Promise<void> {
  const options = parseProductionSyncCliArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const allSymbols = await loadAllFundSymbols(prisma);
    let priceSymbols = await loadUsSymbolsMissingPrices(prisma);

    logger.log(
      `Production sync plan: ${allSymbols.length} fund(s), ${priceSymbols.length} pending US price import(s), dryRun=${options.dryRun}`,
    );

    if (!options.skipMetadata) {
      const metadataResult = await runBatchedFundSyncPhase({
        logger,
        label: 'Phase 1/6 metadata',
        symbols: allSymbols,
        steps: {
          metadata: true,
          prices: false,
          composition: false,
          scoring: false,
        },
        batchSize: options.metadataBatchSize,
        pauseMs: options.pauseMs,
        maxBatches: options.maxBatches,
        startBatch: options.metadataStartBatch,
        dryRun: options.dryRun,
      });

      if (metadataResult.failed > 0) {
        process.exitCode = 1;
        return;
      }
    } else {
      logger.log('Phase 1/6 metadata: skipped');
    }

    if (!options.skipPrices) {
      if (!options.dryRun) {
        priceSymbols = await loadUsSymbolsMissingPrices(prisma);
      }

      const priceResult = await runBatchedFundSyncPhase({
        logger,
        label: 'Phase 2/6 prices',
        symbols: priceSymbols,
        steps: {
          metadata: false,
          prices: true,
          composition: false,
          scoring: false,
        },
        batchSize: options.priceBatchSize,
        pauseMs: options.pauseMs,
        maxBatches: options.maxBatches,
        startBatch: options.priceStartBatch,
        dryRun: options.dryRun,
      });

      if (priceResult.failed > 0) {
        process.exitCode = 1;
        return;
      }
    } else {
      logger.log('Phase 2/6 prices: skipped');
    }

    if (options.skipPostProcessing || options.dryRun) {
      logger.log(
        options.dryRun
          ? 'Phases 3-6 skipped in dry-run mode'
          : 'Phases 3-6 post-processing skipped by flag',
      );
      return;
    }

    logger.log('Phase 3/6 theme backfill');
    if (runNestCli('src/cli/run-fund-theme-backfill.ts') !== 0) {
      process.exitCode = 1;
      return;
    }

    logger.log('Phase 4/6 benchmark backfill');
    if (runNestCli('src/cli/backfill-fund-benchmarks.ts') !== 0) {
      process.exitCode = 1;
      return;
    }

    logger.log('Phase 5/6 catalog visibility reconcile');
    if (runNestCli('src/cli/run-catalog-visibility-reconcile.ts') !== 0) {
      process.exitCode = 1;
      return;
    }

    logger.log('Phase 6/6 scoring recalculation');
    const fundDailySyncService = app.get(FundDailySyncService);
    const scoringResult = await fundDailySyncService.runManualSync({
      steps: {
        metadata: false,
        prices: false,
        composition: false,
        scoring: true,
      },
    });

    logger.log(
      `Production sync finished. Scoring=${scoringResult.scoring.status}`,
    );
  } finally {
    await app.close();
  }
}

/**
 * Parses CLI flags for the production sync pipeline.
 *
 * @param args - Raw process arguments excluding node and script paths.
 */
function parseProductionSyncCliArgs(
  args: readonly string[],
): ProductionSyncCliOptions {
  let metadataBatchSize = DEFAULT_METADATA_BATCH_SIZE;
  let priceBatchSize = DEFAULT_SYNC_BATCH_SIZE;
  let pauseMs = DEFAULT_SYNC_BATCH_PAUSE_MS;
  let maxBatches: number | null = null;
  let metadataStartBatch = 1;
  let priceStartBatch = 1;
  let dryRun = false;
  let skipMetadata = false;
  let skipPrices = false;
  let skipPostProcessing = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--batch-size': {
        const value = readCliRequiredValue(args, index, '--batch-size');
        const parsed = parseCliPositiveInt(value, '--batch-size');
        metadataBatchSize = parsed;
        priceBatchSize = parsed;
        index += 1;
        break;
      }
      case '--metadata-batch-size': {
        const value = readCliRequiredValue(
          args,
          index,
          '--metadata-batch-size',
        );
        metadataBatchSize = parseCliPositiveInt(value, '--metadata-batch-size');
        index += 1;
        break;
      }
      case '--price-batch-size': {
        const value = readCliRequiredValue(args, index, '--price-batch-size');
        priceBatchSize = parseCliPositiveInt(value, '--price-batch-size');
        index += 1;
        break;
      }
      case '--pause-ms': {
        const value = readCliRequiredValue(args, index, '--pause-ms');
        pauseMs = parseCliNonNegativeInt(value, '--pause-ms');
        index += 1;
        break;
      }
      case '--max-batches': {
        const value = readCliRequiredValue(args, index, '--max-batches');
        maxBatches = parseCliPositiveInt(value, '--max-batches');
        index += 1;
        break;
      }
      case '--start-batch': {
        const value = readCliRequiredValue(args, index, '--start-batch');
        metadataStartBatch = parseCliPositiveInt(value, '--start-batch');
        index += 1;
        break;
      }
      case '--metadata-start-batch': {
        const value = readCliRequiredValue(args, index, '--metadata-start-batch');
        metadataStartBatch = parseCliPositiveInt(value, '--metadata-start-batch');
        index += 1;
        break;
      }
      case '--price-start-batch': {
        const value = readCliRequiredValue(args, index, '--price-start-batch');
        priceStartBatch = parseCliPositiveInt(value, '--price-start-batch');
        index += 1;
        break;
      }
      case '--dry-run':
        dryRun = true;
        break;
      case '--skip-metadata':
        skipMetadata = true;
        break;
      case '--skip-prices':
        skipPrices = true;
        break;
      case '--skip-post-processing':
        skipPostProcessing = true;
        break;
      case '--help':
        printProductionSyncHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (metadataBatchSize * 2 > FMP_CALLS_PER_MINUTE) {
    throw new Error(
      `--metadata-batch-size must be <= ${Math.floor(FMP_CALLS_PER_MINUTE / 2)} (two FMP calls per symbol)`,
    );
  }

  if (priceBatchSize > FMP_CALLS_PER_MINUTE) {
    throw new Error(
      `--price-batch-size must be <= ${FMP_CALLS_PER_MINUTE} to respect the FMP Starter quota`,
    );
  }

  return {
    metadataBatchSize,
    priceBatchSize,
    pauseMs,
    maxBatches,
    metadataStartBatch,
    priceStartBatch,
    dryRun,
    skipMetadata,
    skipPrices,
    skipPostProcessing,
  };
}

/** Prints production sync CLI usage instructions to stdout. */
function printProductionSyncHelp(): void {
  process.stdout.write(`Usage: npm run sync:production -- [options]

Runs the production database pipeline in order:
  1. Metadata refresh (all funds, batched)
  2. US price history import (missing prices only, batched)
  3. Investment theme + themeLabel backfill
  4. Benchmark backfill + visibility promotion
  5. Catalog visibility reconcile
  6. RN-04 scoring recalculation

Options:
  --batch-size N              Set both metadata and price batch sizes
  --metadata-batch-size N     Metadata batch size (default: ${DEFAULT_METADATA_BATCH_SIZE})
  --price-batch-size N        Price batch size (default: ${DEFAULT_SYNC_BATCH_SIZE})
  --pause-ms N                Pause between batches in ms (default: ${DEFAULT_SYNC_BATCH_PAUSE_MS})
  --max-batches N             Cap each FMP phase to N batches
  --start-batch N             Resume metadata from batch N (alias of --metadata-start-batch)
  --metadata-start-batch N    Resume metadata from batch N (default: 1)
  --price-start-batch N       Resume prices from batch N (default: 1)
  --skip-metadata             Skip metadata refresh
  --skip-prices               Skip price import
  --skip-post-processing      Skip themes, benchmarks, visibility, scoring
  --dry-run                   Print batch plans without executing
  --help                      Show this message

Example (resume after batch 4 completed, batch 5 interrupted):
  npm run sync:production -- --metadata-start-batch 5
`;
}

void runProductionSyncCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exitCode = 1;
});
