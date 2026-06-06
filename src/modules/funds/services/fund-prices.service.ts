import { Injectable } from '@nestjs/common';
import type { IndexFundHistoricalPrice } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import { mapIndexFundHistoricalPriceToUpsertInput } from '../entities/fund-price.mapper';
import type {
  FundPrice,
  FundPriceHistoryQuery,
  UpsertFundPriceInput,
} from '../entities/fund-price.schema';
import { upsertFundPriceInputSchema } from '../entities/fund-price.schema';
import { FundPricesRepository } from '../repositories/fund-prices.repository';

/**
 * Application service for persisted fund price history used by charts.
 */
@Injectable()
export class FundPricesService {
  constructor(private readonly fundPricesRepository: FundPricesRepository) {}

  /**
   * Persists normalized provider prices for charting and analytics.
   *
   * @param fundId - Persisted fund identifier.
   * @param prices - Normalized provider historical prices.
   * @returns Number of rows processed.
   */
  async saveProviderPrices(
    fundId: string,
    prices: readonly IndexFundHistoricalPrice[],
  ): Promise<number> {
    const inputs = prices.map((price) =>
      upsertFundPriceInputSchema.parse(
        mapIndexFundHistoricalPriceToUpsertInput(price),
      ),
    );

    return this.savePrices(fundId, inputs);
  }

  /**
   * Persists validated end-of-day price rows for a fund.
   *
   * @param fundId - Persisted fund identifier.
   * @param prices - Validated upsert inputs.
   * @returns Number of rows processed.
   */
  async savePrices(
    fundId: string,
    prices: readonly UpsertFundPriceInput[],
  ): Promise<number> {
    const validatedPrices = prices.map((price) =>
      upsertFundPriceInputSchema.parse(price),
    );

    return this.fundPricesRepository.upsertMany(fundId, validatedPrices);
  }

  /**
   * Returns persisted price history for chart rendering.
   *
   * @param fundId - Persisted fund identifier.
   * @param query - Optional date range filters.
   * @returns Price rows ordered by date ascending.
   */
  async getHistory(
    fundId: string,
    query: FundPriceHistoryQuery = {},
  ): Promise<FundPrice[]> {
    return this.fundPricesRepository.findHistory(fundId, query);
  }

  /**
   * Returns the latest persisted price date for incremental syncs.
   *
   * @param fundId - Persisted fund identifier.
   * @returns Latest ISO date string or `null`.
   */
  async getLatestDate(fundId: string): Promise<string | null> {
    return this.fundPricesRepository.findLatestDate(fundId);
  }
}
