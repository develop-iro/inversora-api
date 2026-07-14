import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { parseApiResponse } from '../../core/api/parse-api-response';
import {
  rankingsQuerySchema,
  rankingsResponseSchema,
} from '../../core/api/schemas/rankings.schema';
import type {
  RankingsQuery,
  RankingsResponse,
} from '../../core/api/schemas/rankings.schema';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { FundPricesService } from '../funds/services/fund-prices.service';
import {
  collectFundIdsNeedingReturnFallback,
  loadReturnSnapshotFallbacksByFundIds,
} from '../funds/entities/fund-returns.enricher';
import { buildRankingsResponse } from './entities/ranking.mapper';
/**
 * Use case for benchmark-scoped fund rankings (`GET /rankings`).
 */
@Injectable()
export class GetRankingsUseCase {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly fundPricesService: FundPricesService,
  ) {}
  /**
   * Returns funds ranked by Inversora Score inside comparable benchmark groups.
   *
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Validated rankings response segmented by benchmark (RN-02).
   */
  async execute(rawQuery: Record<string, unknown>): Promise<RankingsResponse> {
    const query = this.parseRankingsQuery(rawQuery);
    const [funds, aggregation] = await Promise.all([
      this.fundsRepository.findRankingFundsForQuery(query),
      this.fundsRepository.findRankingFundsAggregation(query),
    ]);
    const returnFallbacks = await loadReturnSnapshotFallbacksByFundIds(
      this.fundPricesService,
      collectFundIdsNeedingReturnFallback(funds),
    );
    const baseResponse = buildRankingsResponse(
      funds,
      query,
      aggregation,
      returnFallbacks,
    );
    return parseApiResponse(
      rankingsResponseSchema,
      baseResponse,
      'get-rankings',
    );
  }

  private parseRankingsQuery(rawQuery: Record<string, unknown>): RankingsQuery {
    const parsed = rankingsQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid rankings query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
