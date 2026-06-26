import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.service';
import { ScoringService } from '../../scoring/services/scoring.service';
import { FundsRepository } from '../repositories/funds.repository';
import { isNonUsListedSymbol } from '../utils/fund-listing.utils';
import { isPaidPlanCapabilityError } from '../utils/sync-capability.utils';
import type {
  FundDailySyncItemResult,
  FundDailySyncResult,
  FundDailySyncScoringResult,
  ManualSyncOptions,
  ManualSyncResult,
  ResolvedManualSyncSteps,
} from './fund-daily-sync.types';
import { FundCompositionSyncService } from './fund-composition-sync.service';
import { FundDiscoveryService } from './fund-discovery.service';
import { FundPriceSyncService } from './fund-price-sync.service';
import { FundSyncService } from './fund-sync.service';

/**
 * Orchestrates daily fund metadata, price, and composition synchronization.
 */
@Injectable()
export class FundDailySyncService {
  private readonly logger = new Logger(FundDailySyncService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly fundsRepository: FundsRepository,
    private readonly fundDiscoveryService: FundDiscoveryService,
    private readonly fundSyncService: FundSyncService,
    private readonly fundPriceSyncService: FundPriceSyncService,
    private readonly fundCompositionSyncService: FundCompositionSyncService,
    @Inject(forwardRef(() => ScoringService))
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Runs the daily sync workflow for configured or persisted fund symbols.
   *
   * @returns Aggregate sync result with per-symbol outcomes.
   */
  async runDailySync(): Promise<FundDailySyncResult> {
    const result = await this.runManualSync({
      discover: this.config.syncEtfListDiscoveryEnabled,
    });

    return {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
      scoring: result.scoring,
    };
  }

  /**
   * Runs the synchronization pipeline with optional step and symbol overrides.
   *
   * Each symbol is processed independently; failures do not abort remaining
   * symbols. Upserts are idempotent at the repository layer.
   *
   * @param options - Manual sync configuration.
   * @returns Aggregate sync result with execution metadata.
   */
  async runManualSync(
    options: ManualSyncOptions = {},
  ): Promise<ManualSyncResult> {
    const runId = randomUUID();
    const startedAt = new Date();
    const steps = this.resolveManualSyncSteps(options.steps);

    this.logger.log(
      `Manual sync ${runId} started (steps: ${formatStepsForLog(steps)})`,
    );

    const symbols = await this.resolveManualSyncSymbols(options);
    const hasSymbolSteps = steps.metadata || steps.prices || steps.composition;

    if (symbols.length === 0 && hasSymbolSteps) {
      const finishedAt = new Date();

      this.logger.log(
        `Manual sync ${runId} skipped: no symbols configured or persisted`,
      );

      return {
        runId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        steps,
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
        scoring: { status: 'skipped' },
      };
    }

    const results = await this.syncSymbolsWithSteps(symbols, steps, options);
    const succeeded = results.filter(
      (result) => result.status === 'success',
    ).length;
    const scoring = steps.scoring
      ? await this.runAutomaticScoring()
      : { status: 'skipped' as const };

    const finishedAt = new Date();
    const summary: ManualSyncResult = {
      runId,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      steps,
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
      scoring,
    };

    this.logger.log(
      `Manual sync ${runId} finished in ${summary.durationMs}ms ` +
        `(total=${summary.total}, succeeded=${summary.succeeded}, ` +
        `failed=${summary.failed}, scoring=${summary.scoring.status})`,
    );

    return summary;
  }

  private async syncSymbolsWithSteps(
    symbols: readonly string[],
    steps: ResolvedManualSyncSteps,
    options: ManualSyncOptions,
  ): Promise<FundDailySyncItemResult[]> {
    if (!steps.metadata && !steps.prices && !steps.composition) {
      return [];
    }

    const results: FundDailySyncItemResult[] = [];

    for (const symbol of symbols) {
      results.push(await this.syncSymbolWithSteps(symbol, steps, options));
    }

    return results;
  }

  private async syncSymbolWithSteps(
    symbol: string,
    steps: ResolvedManualSyncSteps,
    options: ManualSyncOptions,
  ): Promise<FundDailySyncItemResult> {
    try {
      const normalizedSymbol = symbol.trim().toUpperCase();
      let fundCreated: boolean | undefined;
      let pricesSynced: number | undefined;
      let upToDate: boolean | undefined;
      let holdingsSynced: number | undefined;
      let allocationsSynced: number | undefined;
      let compositionAsOf: string | undefined;
      let compositionSkipped = false;
      let pricesSkipped = false;

      if (steps.metadata) {
        const fundResult = await this.fundSyncService.syncFromFmp(symbol);
        fundCreated = fundResult.created;
      }

      if (steps.prices) {
        if (isNonUsListedSymbol(normalizedSymbol)) {
          pricesSkipped = true;
          this.logger.log(
            `Price sync skipped for non-US symbol ${normalizedSymbol}`,
          );
        } else {
          const priceResult = await this.fundPriceSyncService.syncFromFmp(
            symbol,
            {
              from: options.historyFrom,
              to: options.historyTo,
              incremental: options.incrementalPrices ?? true,
            },
          );
          pricesSynced = priceResult.pricesSynced;
          upToDate = priceResult.upToDate;
        }
      }

      if (steps.composition) {
        try {
          const compositionResult =
            await this.fundCompositionSyncService.syncFromFmp(symbol);
          holdingsSynced = compositionResult.holdingsSynced;
          allocationsSynced = compositionResult.allocationsSynced;
          compositionAsOf = compositionResult.asOf;
        } catch (error: unknown) {
          if (isPaidPlanCapabilityError(error)) {
            compositionSkipped = true;
            this.logger.warn(
              `Composition sync skipped for ${normalizedSymbol}: ${error instanceof Error ? error.message : String(error)}`,
            );
          } else {
            throw error;
          }
        }
      }

      return {
        symbol,
        status: 'success',
        fundCreated,
        pricesSynced,
        upToDate,
        holdingsSynced,
        allocationsSynced,
        compositionAsOf,
        ...(compositionSkipped ? { compositionSkipped: true } : {}),
        ...(pricesSkipped ? { pricesSkipped: true } : {}),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Manual sync failed for ${symbol}: ${message}`);

      return {
        symbol,
        status: 'failed',
        error: message,
      };
    }
  }

  private async runAutomaticScoring(): Promise<FundDailySyncScoringResult> {
    try {
      const scoringResult = await this.scoringService.recalculateAllScores();

      if (scoringResult.total === 0) {
        return { status: 'skipped' };
      }

      return {
        status: 'success',
        total: scoringResult.total,
        updated: scoringResult.updated,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Manual sync scoring failed: ${message}`);

      return {
        status: 'failed',
        error: message,
      };
    }
  }

  private async resolveManualSyncSymbols(
    options: ManualSyncOptions,
  ): Promise<string[]> {
    const resolved = await this.fundDiscoveryService.resolveSyncSymbols({
      explicitSymbols: options.symbols,
      discover: options.discover,
      discoveryLimit: options.discoveryLimit,
      discoveryOffset: options.discoveryOffset,
      discoveryMode: options.discoveryMode,
    });

    if (resolved.length > 0) {
      return resolved;
    }

    const funds = await this.fundsRepository.findAll();

    return funds.map((fund) => fund.symbol);
  }

  private resolveManualSyncSteps(
    steps: ManualSyncOptions['steps'],
  ): ResolvedManualSyncSteps {
    return {
      metadata: steps?.metadata ?? true,
      prices: steps?.prices ?? true,
      composition: steps?.composition ?? this.config.syncCompositionEnabled,
      scoring: steps?.scoring ?? true,
    };
  }
}

/**
 * Formats resolved sync steps for structured log output.
 *
 * @param steps - Resolved manual sync steps.
 * @returns Comma-separated enabled step names.
 */
function formatStepsForLog(steps: ResolvedManualSyncSteps): string {
  return Object.entries(steps)
    .filter(([, enabled]) => enabled)
    .map(([step]) => step)
    .join(', ');
}
