import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { buildRankingsResponse } from '../entities/ranking.mapper';
import {
  rankingsQuerySchema,
  type RankingsQuery,
  type RankingsResponse,
} from '../entities/ranking.schema';

/**
 * Application service for benchmark-scoped fund rankings.
 */
@Injectable()
export class RankingsService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Returns funds ranked by Inversora Score inside comparable benchmark groups.
   *
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Rankings segmented by benchmark (RN-02).
   */
  async getRankings(
    rawQuery: Record<string, unknown>,
  ): Promise<RankingsResponse> {
    const query = this.parseRankingsQuery(rawQuery);
    const funds = await this.fundsRepository.findAll();

    return buildRankingsResponse(funds, query);
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
