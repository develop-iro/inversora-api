import { Injectable } from '@nestjs/common';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { mapProviderFundProfileToUpsertFundInput } from '../entities/fund.mapper';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPriceSyncService } from './fund-price-sync.service';
import type { FundSyncOptions, FundSyncResult } from './fund-sync.types';

/**
 * Application service that imports normalized fund data from FMP into PostgreSQL.
 */
@Injectable()
export class FundSyncService {
  constructor(
    private readonly fmpProvider: FinancialModelingPrepProvider,
    private readonly fundsRepository: FundsRepository,
    private readonly fundPriceSyncService: FundPriceSyncService,
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
    const profile = await this.fmpProvider.getFundProfile(normalizedSymbol);
    const upsertInput = mapProviderFundProfileToUpsertFundInput(profile);
    const { fund, created } = await this.fundsRepository.upsert(upsertInput);

    if (!options.includePrices) {
      return { fund, created };
    }

    const priceSyncResult = await this.fundPriceSyncService.syncFromFmp(
      normalizedSymbol,
      {
        from: options.historyFrom,
        to: options.historyTo,
        incremental: options.incrementalPrices ?? false,
      },
    );

    return {
      fund,
      created,
      pricesSynced: priceSyncResult.pricesSynced,
    };
  }
}
