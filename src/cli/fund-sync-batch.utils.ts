import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../shared/database/prisma.service';
import { isNonUsListedSymbol } from '../modules/funds/utils/fund-listing.utils';

/** FMP Starter plan allows 300 API calls per minute. */
export const FMP_CALLS_PER_MINUTE = 300;

/** Default symbols per price batch (one FMP EOD call each). */
export const DEFAULT_SYNC_BATCH_SIZE = 240;

/** Default symbols per metadata batch (search + etf/info ≈ 2 FMP calls each). */
export const DEFAULT_METADATA_BATCH_SIZE = 100;

/** Default pause between batches in milliseconds. */
export const DEFAULT_SYNC_BATCH_PAUSE_MS = 65_000;

/** Sync step flags passed to {@link runFundSyncBatch}. */
export type FundSyncBatchSteps = {
  readonly metadata: boolean;
  readonly prices: boolean;
  readonly composition: boolean;
  readonly scoring: boolean;
};

/**
 * Loads every persisted fund symbol ordered alphabetically.
 *
 * @param prisma - Nest-managed Prisma service.
 */
export async function loadAllFundSymbols(
  prisma: PrismaService,
): Promise<string[]> {
  const funds = await prisma.fund.findMany({
    select: { symbol: true },
    orderBy: { symbol: 'asc' },
  });

  return funds.map((fund) => fund.symbol.trim().toUpperCase());
}

/**
 * Loads US-listed symbols that still lack persisted EOD prices.
 *
 * @param prisma - Nest-managed Prisma service.
 */
export async function loadUsSymbolsMissingPrices(
  prisma: PrismaService,
): Promise<string[]> {
  const funds = await prisma.fund.findMany({
    select: {
      symbol: true,
      _count: {
        select: { prices: true },
      },
    },
    orderBy: { symbol: 'asc' },
  });

  return funds
    .filter((fund) => !isNonUsListedSymbol(fund.symbol))
    .filter((fund) => fund._count.prices === 0)
    .map((fund) => fund.symbol.trim().toUpperCase());
}

/**
 * Splits symbols into fixed-size batches.
 *
 * @param symbols - Ordered symbol list.
 * @param batchSize - Maximum symbols per batch.
 */
export function chunkFundSymbols(
  symbols: readonly string[],
  batchSize: number,
): string[][] {
  const batches: string[][] = [];

  for (let index = 0; index < symbols.length; index += batchSize) {
    batches.push(symbols.slice(index, index + batchSize));
  }

  return batches;
}

/**
 * Runs one manual sync batch through the existing CLI entrypoint.
 *
 * @param symbols - Symbols processed in this batch.
 * @param steps - Pipeline steps enabled for the batch.
 */
export function runFundSyncBatch(
  symbols: readonly string[],
  steps: FundSyncBatchSteps,
): number | null {
  const args = [
    'scripts/run-cli-with-dotenv.mjs',
    'src/cli/run-fund-sync.ts',
    '--symbols',
    symbols.join(','),
    steps.metadata ? '--metadata' : '--no-metadata',
    steps.prices ? '--prices' : '--no-prices',
    steps.composition ? '--composition' : '--no-composition',
    steps.scoring ? '--scoring' : '--no-scoring',
  ];

  if (steps.prices) {
    args.push('--incremental-prices');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      FMP_SAVE_FIXTURES: 'false',
    },
  });

  return result.status;
}

/**
 * Runs a Nest CLI entrypoint with dotenv overrides.
 *
 * @param entrypoint - Path under `src/cli/`.
 * @param cliArgs - Optional extra CLI arguments.
 */
export function runNestCli(
  entrypoint: string,
  cliArgs: readonly string[] = [],
): number | null {
  const result = spawnSync(
    process.execPath,
    ['scripts/run-cli-with-dotenv.mjs', entrypoint, ...cliArgs],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
      env: process.env,
    },
  );

  return result.status;
}

/**
 * Executes batched FMP sync runs with pauses between batches.
 *
 * @param logger - Nest logger for progress output.
 * @param label - Human-readable phase label.
 * @param symbols - Full symbol universe for the phase.
 * @param steps - Sync steps enabled per batch.
 * @param batchSize - Symbols per batch.
 * @param pauseMs - Delay between batches.
 * @param maxBatches - Optional cap on batches executed.
 * @param startBatch - One-based batch index to resume from (default 1).
 * @param dryRun - When true, only prints the plan.
 */
export async function runBatchedFundSyncPhase(options: {
  readonly logger: Logger;
  readonly label: string;
  readonly symbols: readonly string[];
  readonly steps: FundSyncBatchSteps;
  readonly batchSize: number;
  readonly pauseMs: number;
  readonly maxBatches: number | null;
  readonly startBatch?: number;
  readonly dryRun: boolean;
}): Promise<{ readonly succeeded: number; readonly failed: number }> {
  const batches = chunkFundSymbols(options.symbols, options.batchSize);
  const startIndex = Math.max(0, (options.startBatch ?? 1) - 1);

  if (startIndex >= batches.length) {
    options.logger.log(
      `${options.label}: skipped (start batch ${options.startBatch ?? 1} is beyond ${batches.length} batch(es))`,
    );
    return { succeeded: 0, failed: 0 };
  }

  const remainingBatches = batches.slice(startIndex);
  const batchesToRun =
    options.maxBatches === null
      ? remainingBatches.length
      : Math.min(options.maxBatches, remainingBatches.length);

  options.logger.log(
    `${options.label}: ${options.symbols.length} symbol(s), ${batchesToRun}/${batches.length} batch(es) from #${startIndex + 1}, batchSize=${options.batchSize}, pauseMs=${options.pauseMs}`,
  );

  if (options.dryRun) {
    for (let index = 0; index < batchesToRun; index += 1) {
      const batch = remainingBatches[index] ?? [];
      options.logger.log(
        `[dry-run] ${options.label} batch ${startIndex + index + 1}: ${batch.length} symbol(s), first=${batch[0] ?? 'n/a'}, last=${batch.at(-1) ?? 'n/a'}`,
      );
    }

    return { succeeded: 0, failed: 0 };
  }

  if (options.symbols.length === 0) {
    options.logger.log(`${options.label}: skipped (no symbols)`);
    return { succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (let index = 0; index < batchesToRun; index += 1) {
    const batch = remainingBatches[index] ?? [];
    const batchNumber = startIndex + index + 1;

    options.logger.log(
      `${options.label}: starting batch ${batchNumber}/${batches.length} (${batch.length} symbols)`,
    );

    const exitCode = runFundSyncBatch(batch, options.steps);

    if (exitCode === 0 || exitCode === 1) {
      succeeded += 1;
      options.logger.log(
        `${options.label}: batch ${batchNumber} completed (exit ${exitCode ?? 'unknown'})`,
      );
    } else {
      failed += 1;
      options.logger.error(
        `${options.label}: batch ${batchNumber} aborted with exit code ${exitCode ?? 'unknown'}`,
      );
      break;
    }

    if (index < batchesToRun - 1) {
      options.logger.log(`${options.label}: waiting ${options.pauseMs}ms`);
      await sleep(options.pauseMs);
    }
  }

  options.logger.log(
    `${options.label}: finished (${succeeded} succeeded, ${failed} failed)`,
  );

  return { succeeded, failed };
}

/**
 * Reads the value that follows a CLI flag.
 *
 * @param args - Full CLI argument list.
 * @param index - Index of the flag token.
 * @param flag - Flag name for error messages.
 */
export function readCliRequiredValue(
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
export function parseCliPositiveInt(value: string, flag: string): number {
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
export function parseCliNonNegativeInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} requires a non-negative integer`);
  }

  return parsed;
}
