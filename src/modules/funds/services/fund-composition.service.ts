import { Injectable } from '@nestjs/common';
import type { IndexFundHolding } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import { mapIndexFundHoldingsToUpsertInputs } from '../entities/fund-composition.mapper';
import type {
  FundComposition,
  ReplaceFundCompositionInput,
  UpsertFundAllocationInput,
} from '../entities/fund-composition.schema';
import {
  replaceFundCompositionInputSchema,
  upsertFundAllocationInputSchema,
  upsertFundHoldingInputSchema,
} from '../entities/fund-composition.schema';
import { FundCompositionRepository } from '../repositories/fund-composition.repository';

/**
 * Application service for persisted fund portfolio composition.
 */
@Injectable()
export class FundCompositionService {
  constructor(
    private readonly fundCompositionRepository: FundCompositionRepository,
  ) {}

  /**
   * Persists a full composition snapshot for a fund.
   *
   * @param fundId - Persisted fund identifier.
   * @param snapshot - Holdings and allocation slices for the snapshot.
   * @returns Counts of persisted holdings and allocation rows.
   */
  async saveSnapshot(
    fundId: string,
    snapshot: ReplaceFundCompositionInput,
  ): Promise<{ holdings: number; allocations: number }> {
    const validatedSnapshot = replaceFundCompositionInputSchema.parse(snapshot);

    return this.fundCompositionRepository.replaceSnapshot(
      fundId,
      validatedSnapshot,
    );
  }

  /**
   * Persists normalized provider holdings and optional allocation slices.
   *
   * @param fundId - Persisted fund identifier.
   * @param asOf - Snapshot ISO date.
   * @param holdings - Normalized provider holdings.
   * @param allocations - Optional allocation slices grouped by exposure tab.
   * @returns Counts of persisted holdings and allocation rows.
   */
  async saveProviderComposition(
    fundId: string,
    asOf: string,
    holdings: readonly IndexFundHolding[],
    allocations: readonly UpsertFundAllocationInput[] = [],
  ): Promise<{ holdings: number; allocations: number }> {
    return this.saveSnapshot(fundId, {
      asOf,
      holdings: mapIndexFundHoldingsToUpsertInputs(holdings).map((holding) =>
        upsertFundHoldingInputSchema.parse(holding),
      ),
      allocations: allocations.map((allocation) =>
        upsertFundAllocationInputSchema.parse(allocation),
      ),
    });
  }

  /**
   * Returns a composition snapshot for fund detail exposure views.
   *
   * @param fundId - Persisted fund identifier.
   * @param asOf - Optional snapshot date; latest snapshot is used when omitted.
   * @returns Composition snapshot or `null` when no data exists.
   */
  async getSnapshot(
    fundId: string,
    asOf?: string,
  ): Promise<FundComposition | null> {
    return this.fundCompositionRepository.findSnapshot(fundId, asOf);
  }

  /**
   * Returns the latest persisted composition date for incremental syncs.
   *
   * @param fundId - Persisted fund identifier.
   * @returns Latest ISO date string or `null`.
   */
  async getLatestAsOf(fundId: string): Promise<string | null> {
    return this.fundCompositionRepository.findLatestAsOf(fundId);
  }
}
