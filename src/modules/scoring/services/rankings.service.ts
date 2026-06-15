import { Injectable } from '@nestjs/common';
import type { RankingsResponse } from '../entities/ranking.schema';
import { GetRankingsUseCase } from '../get-rankings';

/**
 * Application service for benchmark-scoped fund rankings.
 */
@Injectable()
export class RankingsService {
  constructor(private readonly getRankingsUseCase: GetRankingsUseCase) {}

  /**
   * Returns funds ranked by Inversora Score inside comparable benchmark groups.
   *
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Rankings segmented by benchmark (RN-02).
   */
  async getRankings(
    rawQuery: Record<string, unknown>,
  ): Promise<RankingsResponse> {
    return this.getRankingsUseCase.execute(rawQuery);
  }
}
