import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { fundIdParamSchema, fundSchema } from '../entities/fund.schema';
import type { Fund } from '../entities/fund.schema';
import {
  buildFundChartResponse,
  resolveChartDateRange,
} from '../entities/fund-chart.mapper';
import {
  fundChartQuerySchema,
} from '../entities/fund-chart.schema';
import type { FundChartResponse } from '../entities/fund-chart.schema';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPricesService } from './fund-prices.service';

/**
 * Application service for fund catalog read operations.
 */
@Injectable()
export class FundsService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly fundPricesService: FundPricesService,
  ) {}

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

  /**
   * Returns a persisted fund by identifier.
   *
   * @param id - Fund UUID from the route parameter.
   * @returns Fund detail entity.
   */
  async getFundById(id: string): Promise<Fund> {
    const fundId = this.parseFundId(id);
    const fund = await this.fundsRepository.findById(fundId);

    if (fund === null) {
      throw new NotFoundException(`Fund ${fundId} was not found`);
    }

    return fundSchema.parse(fund);
  }

  /**
   * Returns indexed historical price points for chart rendering.
   *
   * @param id - Fund UUID from the route parameter.
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Chart series for the requested lookback window.
   */
  async getFundChart(
    id: string,
    rawQuery: Record<string, unknown>,
  ): Promise<FundChartResponse> {
    const fundId = this.parseFundId(id);
    const fund = await this.fundsRepository.findById(fundId);

    if (fund === null) {
      throw new NotFoundException(`Fund ${fundId} was not found`);
    }

    const query = this.parseChartQuery(rawQuery);
    const latestDate = await this.fundPricesService.getLatestDate(fundId);
    const range = resolveChartDateRange(query.period, latestDate);
    const prices =
      range.to === null
        ? []
        : await this.fundPricesService.getHistory(fundId, {
            from: range.from,
            to: range.to,
          });

    return buildFundChartResponse(
      fundId,
      query.period,
      range.from,
      range.to,
      prices,
    );
  }

  private parseChartQuery(rawQuery: Record<string, unknown>) {
    const parsed = fundChartQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid fund chart query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }

  private parseFundId(id: string): string {
    const parsed = fundIdParamSchema.safeParse({ id });

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid fund id',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data.id;
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
