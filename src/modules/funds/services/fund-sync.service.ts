import { Injectable } from '@nestjs/common';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { mapIndexFundProfileToUpsertFundInput } from '../entities/fund.mapper';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPricesService } from './fund-prices.service';
import type { FundSyncOptions, FundSyncResult } from './fund-sync.types';

/**
 * Application service that imports normalized fund data from FMP into PostgreSQL.
 */
@Injectable()
export class FundSyncService {
  constructor(
    private readonly fmpProvider: FinancialModelingPrepProvider,
    private readonly fundsRepository: FundsRepository,
    private readonly fundPricesService: FundPricesService,
  ) {}

  /**
   * Imports a fund from FMP, normalizes it through the provider layer, and upserts it.
   *
   * Flow: FMP → normalizer (provider) → PostgreSQL.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional sync flags and historical date filters.
   * @returns Persisted fund and sync metadata.
   */
  async syncFromFmp(
    symbol: string,
    options: FundSyncOptions = {},
  ): Promise<FundSyncResult> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const includePrices = options.includePrices ?? false;
    const detail = await this.fmpProvider.getIndexFundDetail(normalizedSymbol, {
      from: options.historyFrom,
      to: options.historyTo,
      includeHistory: includePrices,
    });
    const upsertInput = mapIndexFundProfileToUpsertFundInput(detail);
    const { fund, created } = await this.fundsRepository.upsert(upsertInput);

    if (!includePrices || detail.history === undefined) {
      return { fund, created };
    }

    const pricesSynced = await this.fundPricesService.saveProviderPrices(
      fund.id,
      detail.history,
    );

    return {
      fund,
      created,
      pricesSynced,
    };
  }
}
