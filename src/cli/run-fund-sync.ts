import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  mapAdminSyncRequestToManualSyncOptions,
  parseAdminSyncRequest,
} from '../modules/admin/schemas/admin-sync-request.schema';
import { FundDailySyncService } from '../modules/funds/services/fund-daily-sync.service';

const logger = new Logger('RunFundSyncCli');

/**
 * Bootstraps the Nest application context and runs the manual sync pipeline.
 */
async function runFundSyncCli(): Promise<void> {
  const requestBody = parseCliArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fundDailySyncService = app.get(FundDailySyncService);
    const request = parseAdminSyncRequest(requestBody);
    const result = await fundDailySyncService.runManualSync(
      mapAdminSyncRequestToManualSyncOptions(request),
    );

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

    if (result.failed > 0 || result.scoring.status === 'failed') {
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Manual sync CLI failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

/**
 * Parses CLI flags into an admin sync request body.
 *
 * @param args - Raw process arguments excluding node and script paths.
 * @returns Request body compatible with {@link parseAdminSyncRequest}.
 */
function parseCliArgs(args: readonly string[]): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const steps: Record<string, boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--symbols': {
        const value = args[index + 1];

        if (value === undefined) {
          throw new Error('--symbols requires a comma-separated value');
        }

        body.symbols = value.split(',').map((symbol) => symbol.trim());
        index += 1;
        break;
      }
      case '--incremental-prices':
        body.incrementalPrices = true;
        break;
      case '--full-prices':
        body.incrementalPrices = false;
        break;
      case '--from': {
        const value = args[index + 1];

        if (value === undefined) {
          throw new Error('--from requires a YYYY-MM-DD value');
        }

        body.historyFrom = value;
        index += 1;
        break;
      }
      case '--to': {
        const value = args[index + 1];

        if (value === undefined) {
          throw new Error('--to requires a YYYY-MM-DD value');
        }

        body.historyTo = value;
        index += 1;
        break;
      }
      case '--metadata':
        steps.metadata = true;
        break;
      case '--no-metadata':
        steps.metadata = false;
        break;
      case '--prices':
        steps.prices = true;
        break;
      case '--no-prices':
        steps.prices = false;
        break;
      case '--composition':
        steps.composition = true;
        break;
      case '--no-composition':
        steps.composition = false;
        break;
      case '--scoring':
        steps.scoring = true;
        break;
      case '--no-scoring':
        steps.scoring = false;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (Object.keys(steps).length > 0) {
    body.steps = steps;
  }

  return body;
}

/** Prints CLI usage instructions to stdout. */
function printHelp(): void {
  process.stdout.write(`Usage: npm run sync:run -- [options]

Options:
  --symbols SPY,QQQ     Override fund symbols to sync
  --metadata              Enable metadata sync only (combine with other --* step flags)
  --no-metadata           Disable metadata sync
  --prices                Enable price sync only
  --no-prices             Disable price sync
  --composition           Enable composition sync only
  --no-composition        Disable composition sync
  --scoring               Enable scoring recalculation only
  --no-scoring            Disable scoring recalculation
  --incremental-prices    Resume prices from latest persisted date (default)
  --full-prices           Disable incremental price sync
  --from YYYY-MM-DD       Lower bound for historical prices
  --to YYYY-MM-DD         Upper bound for historical prices
  --help                  Show this message

Examples:
  npm run sync:run -- --symbols SPY,QQQ
  npm run sync:run -- --symbols SPY --no-composition --no-scoring
  npm run sync:run -- --scoring
`);
}

void runFundSyncCli();
