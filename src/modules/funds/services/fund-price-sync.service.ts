import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import {
  addDaysToIsoDate,
  compareIsoDates,
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
    const range = await this.resolveSyncRange(fund.id, options, incremental);

    if (range.upToDate) {
      return {
        fundId: fund.id,
        symbol: fund.symbol,
        pricesSynced: 0,
        from: range.from,
        to: range.to,
        upToDate: true,
      };
    }

    const history = await this.fmpProvider.getFundHistory(normalizedSymbol, {
      from: range.from,
      to: range.to,
    });

    if (history.length === 0) {
      return {
        fundId: fund.id,
        symbol: fund.symbol,
        pricesSynced: 0,
        from: range.from,
        to: range.to,
        upToDate: true,
      };
    }

    const pricesSynced = await this.fundPricesService.saveProviderPrices(
      fund.id,
      history,
    );

    return {
      fundId: fund.id,
      symbol: fund.symbol,
      pricesSynced,
      from: range.from,
      to: range.to,
      upToDate: false,
    };
  }

  private async resolveSyncRange(
    fundId: string,
    options: FundPriceSyncOptions,
    incremental: boolean,
  ): Promise<{ from?: string; to?: string; upToDate: boolean }> {
    let from = options.from;
    const to = options.to;

    if (incremental && from === undefined) {
      const latestDate = await this.fundPricesService.getLatestDate(fundId);

      if (latestDate !== null) {
        from = addDaysToIsoDate(latestDate, 1);
      }
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
