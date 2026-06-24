import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import {
  mapCountryWeightingsToUpsertInputs,
  mapSectorWeightingsToUpsertInputs,
} from '../entities/fund-composition.mapper';
import { FundsRepository } from '../repositories/funds.repository';
import { FundCompositionService } from './fund-composition.service';
import type { FundCompositionSyncResult } from './fund-composition-sync.types';

const FMP_PROVIDER = 'financial-modeling-prep';

/**
 * Application service that imports normalized fund composition from FMP into PostgreSQL.
 */
@Injectable()
export class FundCompositionSyncService {
  constructor(
    private readonly fmpProvider: FinancialModelingPrepProvider,
    private readonly fundsRepository: FundsRepository,
    private readonly fundCompositionService: FundCompositionService,
  ) {}

  /**
   * Imports holdings and exposure weightings from FMP and persists a snapshot.
   *
   * Flow: FMP → normalizer (provider) → FundCompositionService → PostgreSQL.
   *
   * @param symbol - Fund ticker symbol.
   * @returns Sync metadata including persisted row counts.
   */
  async syncFromFmp(symbol: string): Promise<FundCompositionSyncResult> {
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

    const composition =
      await this.fmpProvider.getFundComposition(normalizedSymbol);
    const allocations = [
      ...mapSectorWeightingsToUpsertInputs(composition.sectorWeightings),
      ...mapCountryWeightingsToUpsertInputs(composition.countryWeightings),
    ];
    const persisted = await this.fundCompositionService.saveProviderComposition(
      fund.id,
      composition.asOf,
      composition.holdings,
      allocations,
    );

    return {
      fundId: fund.id,
      symbol: fund.symbol,
      asOf: composition.asOf,
      holdingsSynced: persisted.holdings,
      allocationsSynced: persisted.allocations,
    };
  }
}
