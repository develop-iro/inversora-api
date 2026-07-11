import { Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.service';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import type { ProviderFundHistoricalPrice } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import { FUND_RETURN_HISTORY_LOOKBACK_DAYS } from '../entities/fund-returns.enricher';
import {
  addDaysToIsoDate,
  compareIsoDates,
  getTodayIsoDate,
} from '../entities/fund-price.mapper';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPricesService } from './fund-prices.service';
import type {
  FundPriceSyncOptions,
  FundPriceSyncResult,
} from './fund-price-sync.types';

const FMP_PROVIDER = 'financial-modeling-prep';

/**
 * Application service that imports normalized price history from FMP into PostgreSQL.
 */
@Injectable()
export class FundPriceSyncService {
  constructor(
    private readonly config: AppConfigService,
    private readonly fmpProvider: FinancialModelingPrepProvider,
    private readonly fundsRepository: FundsRepository,
    private readonly fundPricesService: FundPricesService,
  ) {}

  /**
   * Imports end-of-day prices from FMP, normalizes them, and upserts them.
   *
   * Flow: FMP → normalizer (provider) → PostgreSQL.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional date filters and incremental sync flag.
   * @returns Sync metadata including the number of rows persisted.
   */
  async syncFromFmp(
    symbol: string,
    options: FundPriceSyncOptions = {},
  ): Promise<FundPriceSyncResult> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const fund = await this.fundsRepository.findBySymbolAndProvider(
      normalizedSymbol,
      FMP_PROVIDER,
    );

    if (fund === null) {
      throw new NotFoundException(
        `Fund ${normalizedSymbol} was not found. Sync fund metadata first.`,
      );
    }

    const incremental = options.incremental ?? true;
    const latestDate = incremental
      ? await this.fundPricesService.getLatestDate(fund.id)
      : null;
    const range = this.resolveSyncRange(options, incremental, latestDate);

    if (range.upToDate) {
      const pricesPruned = await this.pruneRetention(fund.id);

      return {
        fundId: fund.id,
        symbol: fund.symbol,
        pricesSynced: 0,
        pricesPruned,
        from: range.from,
        to: range.to,
        upToDate: true,
      };
    }

    const history = this.filterNewProviderPrices(
      await this.fmpProvider.getFundHistory(normalizedSymbol, {
        from: range.from,
        to: range.to,
      }),
      incremental,
      latestDate,
    );

    if (history.length === 0) {
      const pricesPruned = await this.pruneRetention(fund.id);

      return {
        fundId: fund.id,
        symbol: fund.symbol,
        pricesSynced: 0,
        pricesPruned,
        from: range.from,
        to: range.to,
        upToDate: true,
      };
    }

    const pricesSynced = await this.fundPricesService.saveProviderPrices(
      fund.id,
      history,
    );
    const pricesPruned = await this.pruneRetention(fund.id);

    return {
      fundId: fund.id,
      symbol: fund.symbol,
      pricesSynced,
      pricesPruned,
      from: range.from,
      to: range.to,
      upToDate: incremental && pricesSynced === 0,
    };
  }

  /**
   * Deletes price rows outside the configured retention window for a fund.
   *
   * @param fundId - Persisted fund identifier.
   * @returns Number of deleted rows.
   */
  private async pruneRetention(fundId: string): Promise<number> {
    return this.fundPricesService.pruneRetentionForFund(
      fundId,
      this.config.fundPricesRetentionYears,
    );
  }

  /**
   * Drops provider rows that are already persisted when resuming incrementally.
   *
   * @param history - Normalized provider price history.
   * @param incremental - Whether the sync resumes from the latest stored date.
   * @param latestDate - Latest persisted ISO date, if any.
   * @returns Provider rows that still need to be upserted.
   */
  private filterNewProviderPrices(
    history: readonly ProviderFundHistoricalPrice[],
    incremental: boolean,
    latestDate: string | null,
  ): ProviderFundHistoricalPrice[] {
    if (!incremental || latestDate === null) {
      return [...history];
    }

    return history.filter(
      (price) => compareIsoDates(price.date, latestDate) > 0,
    );
  }

  private resolveSyncRange(
    options: FundPriceSyncOptions,
    incremental: boolean,
    latestDate: string | null,
  ): { from?: string; to?: string; upToDate: boolean } {
    let from = options.from;
    let to = options.to;

    if (incremental && to === undefined) {
      to = getTodayIsoDate();
    }

    if (incremental && from === undefined && latestDate !== null) {
      from = addDaysToIsoDate(latestDate, 1);
    }

    if (from === undefined && latestDate === null) {
      from = addDaysToIsoDate(
        getTodayIsoDate(),
        -FUND_RETURN_HISTORY_LOOKBACK_DAYS,
      );
    }

    if (
      from !== undefined &&
      to !== undefined &&
      compareIsoDates(from, to) > 0
    ) {
      return { from, to, upToDate: true };
    }

    return { from, to, upToDate: false };
  }
}
