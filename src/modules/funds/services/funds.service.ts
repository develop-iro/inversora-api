import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
} from '../entities/fund-list.mapper';
import {
  fundListQuerySchema,
  fundListResponseSchema,
} from '../entities/fund-list.schema';
import type { FundListQuery, FundListResponse } from '../entities/fund-list.schema';
import { FundsRepository } from '../repositories/funds.repository';

/**
 * Application service for fund catalog read operations.
 */
@Injectable()
export class FundsService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Returns a paginated, filtered, and sorted fund list.
   *
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Paginated fund list response.
   */
  async listFunds(rawQuery: Record<string, unknown>): Promise<FundListResponse> {
    const query = this.parseListQuery(rawQuery);
    const where = buildFundListWhereInput(query);
    const orderBy = buildFundListOrderByInput(query.sortBy, query.sortOrder);
    const skip = (query.page - 1) * query.limit;
    const { items, total } = await this.fundsRepository.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
    });

    return fundListResponseSchema.parse({
      data: items,
      meta: buildFundListMeta(query.page, query.limit, total),
    });
  }

  private parseListQuery(rawQuery: Record<string, unknown>): FundListQuery {
    const parsed = fundListQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid fund list query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
