import { spawnSync } from 'node:child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('RunEtfCatalogBatchesCli');

/** Default FMP Starter `etf-list` row count (US ETFs). */
const DEFAULT_CATALOG_SIZE = 6_035;

/** Default symbols processed per batch (rate-limit friendly). */
const DEFAULT_BATCH_SIZE = 50;

/** Parsed CLI options for batched ETF catalog ingestion. */
type BatchCliOptions = {
  readonly startOffset: number;
  readonly batchSize: number;
  readonly catalogSize: number;
  readonly maxBatches: number | null;
  readonly discoveryMode: 'all' | 'indexed';
  readonly metadataOnly: boolean;
  readonly dryRun: boolean;
};

/**
 * Boots repeated `sync:run` invocations with discovery offset pagination.
 */
function runEtfCatalogBatchesCli(): void {
  const options = parseBatchCliArgs(process.argv.slice(2));
  const totalBatches = Math.ceil(
    (options.catalogSize - options.startOffset) / options.batchSize,
  );
  const batchesToRun =
    options.maxBatches === null
      ? totalBatches
      : Math.min(options.maxBatches, totalBatches);

  logger.log(
    `ETF catalog batch plan: ${batchesToRun} batch(es), size ${options.batchSize}, mode ${options.discoveryMode}, start offset ${options.startOffset}, metadataOnly=${options.metadataOnly}`,
  );

  if (options.dryRun) {
    for (let index = 0; index < batchesToRun; index += 1) {
      const offset = options.startOffset + index * options.batchSize;
      logger.log(`[dry-run] offset=${offset} limit=${options.batchSize}`);
    }

    return;
  }

  let succeededBatches = 0;
  let failedBatches = 0;

  for (let index = 0; index < batchesToRun; index += 1) {
    const offset = options.startOffset + index * options.batchSize;
    const batchNumber = index + 1;

    logger.log(
      `Starting batch ${batchNumber}/${batchesToRun} (offset ${offset}, limit ${options.batchSize})`,
    );

    const args = buildSyncRunArgs(options, offset);
    const result = spawnSync('npm', ['run', 'sync:run', '--', ...args], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        FMP_SAVE_FIXTURES: 'false',
      },
    });

    if (result.status === 0 || result.status === 1) {
      succeededBatches += 1;
      logger.log(`Batch ${batchNumber} completed`);
      continue;
    }

    failedBatches += 1;
    logger.error(
      `Batch ${batchNumber} aborted with exit code ${result.status ?? 'unknown'}`,
    );
    process.exitCode = 1;
    break;
  }

  logger.log(
    `Batch run finished: ${succeededBatches} succeeded, ${failedBatches} failed`,
  );
}

/**
 * Builds `sync:run` CLI arguments for a single discovery offset.
 *
 * @param options - Parsed batch CLI options.
 * @param offset - Discovery offset for this batch.
 * @returns Arguments passed after `npm run sync:run --`.
 */
function buildSyncRunArgs(options: BatchCliOptions, offset: number): string[] {
  const args = [
    '--discover',
    '--discovery-mode',
    options.discoveryMode,
    '--discovery-offset',
    String(offset),
    '--discovery-limit',
    String(options.batchSize),
    '--no-composition',
  ];

  if (options.metadataOnly) {
    args.push('--metadata', '--no-prices', '--no-scoring');
  }

  return args;
}

/**
 * Parses CLI flags for batched ETF catalog ingestion.
 *
 * @param args - Raw process arguments excluding node and script paths.
 * @returns Parsed batch options.
 */
function parseBatchCliArgs(args: readonly string[]): BatchCliOptions {
  let startOffset = 0;
  let batchSize = DEFAULT_BATCH_SIZE;
  let catalogSize = DEFAULT_CATALOG_SIZE;
  let maxBatches: number | null = null;
  let discoveryMode: 'all' | 'indexed' = 'all';
  let metadataOnly = true;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--start-offset': {
        const value = readRequiredValue(args, index, '--start-offset');
        startOffset = parseNonNegativeInt(value, '--start-offset');
        index += 1;
        break;
      }
      case '--batch-size': {
        const value = readRequiredValue(args, index, '--batch-size');
        batchSize = parsePositiveInt(value, '--batch-size');
        index += 1;
        break;
      }
      case '--catalog-size': {
        const value = readRequiredValue(args, index, '--catalog-size');
        catalogSize = parsePositiveInt(value, '--catalog-size');
        index += 1;
        break;
      }
      case '--max-batches': {
        const value = readRequiredValue(args, index, '--max-batches');
        maxBatches = parsePositiveInt(value, '--max-batches');
        index += 1;
        break;
      }
      case '--discovery-mode': {
        const value = readRequiredValue(args, index, '--discovery-mode');

        if (value !== 'all' && value !== 'indexed') {
          throw new Error('--discovery-mode requires `all` or `indexed`');
        }

        discoveryMode = value;
        index += 1;
        break;
      }
      case '--full-pipeline':
        metadataOnly = false;
        break;
      case '--metadata-only':
        metadataOnly = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--help':
        printBatchHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {
    startOffset,
    batchSize,
    catalogSize,
    maxBatches,
    discoveryMode,
    metadataOnly,
    dryRun,
  };
}

/**
 * Reads the value that follows a CLI flag.
 *
 * @param args - Full CLI argument list.
 * @param index - Index of the flag token.
 * @param flag - Flag name for error messages.
 * @returns The next argument value.
 */
function readRequiredValue(
  args: readonly string[],
  index: number,
  flag: string,
): string {
  const value = args[index + 1];

  if (value === undefined) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

/**
 * Parses a positive integer CLI value.
 *
 * @param value - Raw string value.
 * @param flag - Flag name for error messages.
 */
function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer`);
  }

  return parsed;
}

/**
 * Parses a non-negative integer CLI value.
 *
 * @param value - Raw string value.
 * @param flag - Flag name for error messages.
 */
function parseNonNegativeInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} requires a non-negative integer`);
  }

  return parsed;
}

/** Prints batch CLI usage instructions to stdout. */
function printBatchHelp(): void {
  process.stdout.write(`Usage: npm run sync:batches -- [options]

Runs repeated fund sync jobs over the FMP etf-list catalog using discovery offset pagination.

Options:
  --start-offset N     First etf-list offset (default: 0)
  --batch-size N       Symbols per batch (default: 50)
  --catalog-size N     Total catalog rows to cover (default: 6035)
  --max-batches N      Stop after N batches (default: all remaining)
  --discovery-mode MODE  all or indexed (default: all)
  --metadata-only      Sync metadata only (default; fastest bulk import)
  --full-pipeline      Also sync prices and scoring per batch
  --dry-run            Print planned batches without executing
  --help               Show this message

Examples:
  npm run sync:batches -- --max-batches 1
  npm run sync:batches -- --start-offset 50 --max-batches 5
  npm run sync:batches -- --full-pipeline --max-batches 3
`);
}

try {
  runEtfCatalogBatchesCli();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exitCode = 1;
}
