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
  isReturnBasedSortField,
  requiresReturnEnrichment,
  RETURN_BASED_SORT_MAX_FUNDS,
} from './entities/fund-list.mapper';
import { mapFundsToApiFunds } from './entities/fund-api.mapper';
import type { FundApi } from './entities/fund-api.schema';
import { enrichFundApiPayloadsWithReturns } from './entities/fund-returns.enricher.mapper';
import { loadReturnSnapshotsByFundIds } from './entities/fund-returns.enricher';
import {
  filterEnrichedFundsByMinReturn,
  sortEnrichedFundsByCatalogField,
  sortEnrichedFundsByReturn,
} from './entities/fund-return-sort';
import { FundsRepository } from './repositories/funds.repository';
import { FundPricesService } from './services/fund-prices.service';

/**
 * Use case for paginated public fund catalog reads (`GET /funds`).
 */
@Injectable()
export class GetFundsUseCase {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly configService: AppConfigService,
    private readonly fundPricesService: FundPricesService,
  ) {}

  /**
   * Returns a paginated, filtered, and sorted fund list.
   *
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Validated paginated fund list response.
   */
  async execute(rawQuery: Record<string, unknown>): Promise<FundListResponse> {
    const query = this.parseListQuery(rawQuery);

    if (requiresReturnEnrichment(query)) {
      return this.executeReturnEnriched(query);
    }

    const where = buildFundListWhereInput(query);
    const orderBy = buildFundListOrderByInput(query.sortBy, query.sortOrder);
    const skip = (query.page - 1) * query.limit;
    const { items, total } = await this.fundsRepository.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
    });
    const data = await this.enrichFunds(items);

    return parseApiResponse(
      fundListResponseSchema,
      {
        data,
        meta: buildFundListMeta(query.page, query.limit, total),
      },
      'get-funds',
    );
  }

  private async executeReturnEnriched(
    query: FundListQuery,
  ): Promise<FundListResponse> {
    const where = buildFundListWhereInput(query);
    const orderBy = buildFundListOrderByInput(query.sortBy, query.sortOrder);
    const { items } = await this.fundsRepository.findMany({
      where,
      orderBy,
      skip: 0,
      take: RETURN_BASED_SORT_MAX_FUNDS,
    });

    const enriched = await this.enrichFunds(items);
    const filtered = filterEnrichedFundsByMinReturn(enriched, {
      minReturn1y: query.minReturn1y,
      minReturn3y: query.minReturn3y,
    });
    const sorted = isReturnBasedSortField(query.sortBy)
      ? sortEnrichedFundsByReturn(filtered, query.sortBy, query.sortOrder)
      : sortEnrichedFundsByCatalogField(
          filtered,
          query.sortBy,
          query.sortOrder,
        );
    const skip = (query.page - 1) * query.limit;
    const pageItems = sorted.slice(skip, skip + query.limit);

    return parseApiResponse(
      fundListResponseSchema,
      {
        data: pageItems,
        meta: buildFundListMeta(query.page, query.limit, sorted.length),
      },
      'get-funds',
    );
  }

  private async enrichFunds(
    items: Awaited<ReturnType<FundsRepository['findMany']>>['items'],
  ): Promise<FundApi[]> {
    const apiFunds = mapFundsToApiFunds(
      items,
      this.configService.brandfetchClientId,
    );
    const fundIds = items.map((item) => item.id);
    const returnSnapshots = await loadReturnSnapshotsByFundIds(
      this.fundPricesService,
      fundIds,
    );

    return enrichFundApiPayloadsWithReturns(apiFunds, fundIds, returnSnapshots);
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
