import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
} from '../funds/entities/fund-list.mapper';
import { mapFundsToApiFunds } from '../funds/entities/fund-api.mapper';
import {
  fundListResponseSchema,
  type FundListResponse,
} from '../funds/entities/fund-list.schema';
import { FundsRepository } from '../funds/repositories/funds.repository';
import {
  adminFundListQuerySchema,
  type AdminFundListQuery,
} from './schemas/admin-funds.schema';
import { AppConfigService } from '../../shared/config/config.service';

/**
 * Use case for paginated admin fund catalog reads (`GET /admin/funds`).
 */
@Injectable()
export class GetAdminFundsUseCase {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Returns a paginated admin fund list including quarantined and blocked rows.
   *
   * @param rawQuery - Raw HTTP query parameters.
   */
  async execute(rawQuery: Record<string, unknown>): Promise<FundListResponse> {
    const parsedQuery = this.parseAdminListQuery(rawQuery);
    const where = buildFundListWhereInput(parsedQuery, {
      catalogVisibility: parsedQuery.catalogVisibility ?? [
        'visible',
        'quarantined',
        'blocked',
      ],
    });
    const orderBy = buildFundListOrderByInput(
      parsedQuery.sortBy,
      parsedQuery.sortOrder,
    );
    const skip = (parsedQuery.page - 1) * parsedQuery.limit;
    const { items, total } = await this.fundsRepository.findMany({
      where,
      orderBy,
      skip,
      take: parsedQuery.limit,
    });

    return fundListResponseSchema.parse({
      data: mapFundsToApiFunds(items, this.configService.brandfetchClientId),
      meta: buildFundListMeta(parsedQuery.page, parsedQuery.limit, total),
    });
  }

  private parseAdminListQuery(
    rawQuery: Record<string, unknown>,
  ): AdminFundListQuery {
    const parsed = adminFundListQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid admin fund list query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
