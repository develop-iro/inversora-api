import { Injectable } from '@nestjs/common';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { mapProviderFundProfileToUpsertFundInput } from '../entities/fund.mapper';
import { FundsRepository } from '../repositories/funds.repository';
import { CatalogVisibilityService } from './catalog-visibility.service';
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
    private readonly catalogVisibilityService: CatalogVisibilityService,
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
    const upsertInput = {
      ...mapProviderFundProfileToUpsertFundInput(profile),
      themeClassificationDescription: profile.description,
    };
    const { fund, created } = await this.fundsRepository.upsert(upsertInput);
    const fundWithVisibility =
      await this.catalogVisibilityService.applyAutomaticVisibilityRules(fund);

    if (!options.includePrices) {
      return { fund: fundWithVisibility, created };
    }

    const priceSyncResult = await this.fundPriceSyncService.syncFromFmp(
      normalizedSymbol,
      {
        from: options.historyFrom,
        to: options.historyTo,
        incremental: options.incrementalPrices ?? true,
      },
    );

    return {
      fund: fundWithVisibility,
      created,
      pricesSynced: priceSyncResult.pricesSynced,
    };
  }
}
