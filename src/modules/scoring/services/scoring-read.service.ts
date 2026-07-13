import { Injectable } from '@nestjs/common';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { resolvePersistedInvesoraScore } from '../../funds/entities/fund-materialized.mapper';
import type { InvesoraScore } from '../entities/invesora-score.schema';

/**
 * Read-only access to persisted Inversora Score payloads.
 */
@Injectable()
export class ScoringReadService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Returns the persisted RN-04 score payload for a fund id.
   *
   * @param fundId - Persisted fund identifier.
   */
  async getPersistedScoreByFundId(
    fundId: string,
  ): Promise<InvesoraScore | null> {
    const fund = await this.fundsRepository.findById(fundId);

    if (fund === null) {
      return null;
    }

    return resolvePersistedInvesoraScore(fund);
  }
}
