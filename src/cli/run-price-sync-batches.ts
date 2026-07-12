import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FundDailySyncService } from '../modules/funds/services/fund-daily-sync.service';
import { PrismaService } from '../shared/database/prisma.service';
import {
  DEFAULT_SYNC_BATCH_PAUSE_MS,
  DEFAULT_SYNC_BATCH_SIZE,
  FMP_CALLS_PER_MINUTE,
  loadAllFundSymbols,
  loadUsSymbolsMissingPrices,
  parseCliNonNegativeInt,
  parseCliPositiveInt,
  readCliRequiredValue,
  runBatchedFundSyncPhase,
} from './fund-sync-batch.utils';
import { isNonUsListedSymbol } from '../modules/funds/utils/fund-listing.utils';

const logger = new Logger('RunPriceSyncBatchesCli');

/** Parsed CLI options for batched price synchronization. */
type PriceBatchCliOptions = {
  readonly batchSize: number;
  readonly pauseMs: number;
  readonly maxBatches: number | null;
  readonly startBatch: number;
  readonly includeExisting: boolean;
  readonly dryRun: boolean;
};

/**
 * Boots batched price synchronization for persisted US-listed fund symbols.
 */
async function runPriceSyncBatchesCli(): Promise<void> {
  const options = parsePriceBatchCliArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    let symbols = await loadUsSymbolsMissingPrices(prisma);

    if (options.includeExisting) {
      const funds = await loadAllFundSymbols(prisma);
      symbols = funds.filter((symbol) => !isNonUsListedSymbol(symbol));
    }

    const result = await runBatchedFundSyncPhase({
      logger,
      label: 'Price sync',
      symbols,
      steps: {
        metadata: false,
        prices: true,
        composition: false,
        scoring: false,
      },
      batchSize: options.batchSize,
      pauseMs: options.pauseMs,
      maxBatches: options.maxBatches,
      startBatch: options.startBatch,
      dryRun: options.dryRun,
    });

    if (
      !options.dryRun &&
      result.failed === 0 &&
      symbols.length > 0 &&
      (options.maxBatches === null ||
        options.maxBatches >=
          Math.ceil(symbols.length / Math.max(options.batchSize, 1)))
    ) {
      logger.log('Running final scoring recalculation');
      const fundDailySyncService = app.get(FundDailySyncService);
      const scoringResult = await fundDailySyncService.runManualSync({
        steps: {
          metadata: false,
          prices: false,
          composition: false,
          scoring: true,
        },
      });

      logger.log(`Scoring finished: ${scoringResult.scoring.status}`);
    }
  } finally {
    await app.close();
  }
}

/**
 * Parses CLI flags for batched price synchronization.
 *
 * @param args - Raw process arguments excluding node and script paths.
 */
function parsePriceBatchCliArgs(args: readonly string[]): PriceBatchCliOptions {
  let batchSize = DEFAULT_SYNC_BATCH_SIZE;
  let pauseMs = DEFAULT_SYNC_BATCH_PAUSE_MS;
  let maxBatches: number | null = null;
  let startBatch = 1;
  let includeExisting = false;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--batch-size': {
        const value = readCliRequiredValue(args, index, '--batch-size');
        batchSize = parseCliPositiveInt(value, '--batch-size');
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
        startBatch = parseCliPositiveInt(value, '--start-batch');
        index += 1;
        break;
      }
      case '--include-existing':
        includeExisting = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--help':
        printPriceBatchHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (batchSize > FMP_CALLS_PER_MINUTE) {
    throw new Error(
      `--batch-size must be <= ${FMP_CALLS_PER_MINUTE} to respect the FMP Starter quota`,
    );
  }

  return {
    batchSize,
    pauseMs,
    maxBatches,
    startBatch,
    includeExisting,
    dryRun,
  };
}

/** Prints price batch CLI usage instructions to stdout. */
function printPriceBatchHelp(): void {
  process.stdout.write(`Usage: npm run sync:prices:batches -- [options]

Runs price-only sync batches for persisted US-listed fund symbols, respecting FMP rate limits.

Options:
  --batch-size N       Symbols per batch (default: ${DEFAULT_SYNC_BATCH_SIZE}, max: ${FMP_CALLS_PER_MINUTE})
  --pause-ms N         Pause between batches in ms (default: ${DEFAULT_SYNC_BATCH_PAUSE_MS})
  --max-batches N      Stop after N batches (default: all remaining)
  --include-existing   Re-sync symbols that already have persisted prices
  --dry-run            Print planned batches without executing
  --help               Show this message
`);
}

void runPriceSyncBatchesCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exitCode = 1;
});
