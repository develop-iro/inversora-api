import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.service';
import { FundsRepository } from '../repositories/funds.repository';
import type {
  FundDailySyncItemResult,
  FundDailySyncResult,
} from './fund-daily-sync.types';
import { FundPriceSyncService } from './fund-price-sync.service';
import { FundSyncService } from './fund-sync.service';

/**
 * Orchestrates daily fund metadata and incremental price synchronization.
 */
@Injectable()
export class FundDailySyncService {
  constructor(
    private readonly config: AppConfigService,
    private readonly fundsRepository: FundsRepository,
    private readonly fundSyncService: FundSyncService,
    private readonly fundPriceSyncService: FundPriceSyncService,
  ) {}

  /**
   * Runs the daily sync workflow for configured or persisted fund symbols.
   *
   * @returns Aggregate sync result with per-symbol outcomes.
   */
  async runDailySync(): Promise<FundDailySyncResult> {
    const symbols = await this.resolveSymbols();

    if (symbols.length === 0) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
      };
    }

    const results: FundDailySyncItemResult[] = [];

    for (const symbol of symbols) {
      results.push(await this.syncSymbol(symbol));
    }

    const succeeded = results.filter(
      (result) => result.status === 'success',
    ).length;

    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  private async syncSymbol(symbol: string): Promise<FundDailySyncItemResult> {
    try {
      const fundResult = await this.fundSyncService.syncFromFmp(symbol);
      const priceResult = await this.fundPriceSyncService.syncFromFmp(symbol, {
        incremental: true,
      });

      return {
        symbol,
        status: 'success',
        fundCreated: fundResult.created,
        pricesSynced: priceResult.pricesSynced,
        upToDate: priceResult.upToDate,
      };
    } catch (error: unknown) {
      return {
        symbol,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async resolveSymbols(): Promise<string[]> {
    const configuredSymbols = this.config.syncFundSymbols;

    if (configuredSymbols.length > 0) {
      return [...configuredSymbols];
    }

    const funds = await this.fundsRepository.findAll();

    return funds.map((fund) => fund.symbol);
  }
}
