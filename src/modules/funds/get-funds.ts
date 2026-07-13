import { BadRequestException, Injectable } from '@nestjs/common';

import { z } from 'zod';

import { parseApiResponse } from '../../core/api/parse-api-response';

import {
  fundListQuerySchema,
  fundListResponseSchema,
} from '../../core/api/schemas/fund-list.schema';

import type {
  FundListQuery,
  FundListResponse,
} from '../../core/api/schemas/fund-list.schema';

import { AppConfigService } from '../../shared/config/config.service';

import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
} from './entities/fund-list.mapper';

import { mapFundsToApiFunds } from './entities/fund-api.mapper';

import type { FundApi } from './entities/fund-api.schema';

import { FundsRepository } from './repositories/funds.repository';

/**

 * Use case for paginated public fund catalog reads (`GET /funds`).

 */

@Injectable()
export class GetFundsUseCase {
  constructor(
    private readonly fundsRepository: FundsRepository,

    private readonly configService: AppConfigService,
  ) {}

  /**

   * Returns a paginated, filtered, and sorted fund list.

   *

   * @param rawQuery - Raw HTTP query parameters.

   * @returns Validated paginated fund list response.

   */

  async execute(rawQuery: Record<string, unknown>): Promise<FundListResponse> {
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

    const data = this.mapFundsToListPayload(items);

    return parseApiResponse(
      fundListResponseSchema,

      {
        data,

        meta: buildFundListMeta(query.page, query.limit, total),
      },

      'get-funds',
    );
  }

  /**

   * Maps persisted funds to public list payloads using materialized columns only.

   *

   * @param items - Persisted fund rows for the current page.

   */

  private mapFundsToListPayload(
    items: Awaited<ReturnType<FundsRepository['findMany']>>['items'],
  ): FundApi[] {
    return mapFundsToApiFunds(items, this.configService.brandfetchClientId);
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
