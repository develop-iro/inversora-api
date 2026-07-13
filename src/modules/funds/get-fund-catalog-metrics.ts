import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { parseApiResponse } from '../../core/api/parse-api-response';
import {
  fundCatalogMetricsQuerySchema,
  fundCatalogMetricsResponseSchema,
  type FundCatalogMetricsQuery,
  type FundCatalogMetricsResponse,
} from '../../core/api/schemas/fund-catalog-metrics.schema';
import type { FundListQuery } from '../../core/api/schemas/fund-list.schema';
import { buildFundListWhereInput } from './entities/fund-list.mapper';
import type { InvestmentTheme } from './entities/fund.schema';
import { FundsRepository } from './repositories/funds.repository';

const INVESTMENT_THEME_LABELS: Record<InvestmentTheme, string> = {
  'global-equity': 'Renta variable global',
  'us-equity': 'Renta variable USA',
  'europe-equity': 'Renta variable Europa',
  'emerging-equity': 'Mercados emergentes',
  'fixed-income': 'Renta fija',
  'multi-asset': 'Multiactivo',
  technology: 'Tecnologia',
  esg: 'ESG y sostenibilidad',
  'sector-other': 'Sectorial',
  unclassified: 'Sin clasificar',
};

/**
 * Use case for lightweight catalog totals and filter facets.
 */
@Injectable()
export class GetFundCatalogMetricsUseCase {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Returns numeric catalog metrics without loading full fund entities.
   *
   * @param rawQuery - Raw HTTP query parameters.
   * @returns Total matching rows and category counts.
   */
  async execute(
    rawQuery: Record<string, unknown>,
  ): Promise<FundCatalogMetricsResponse> {
    const query = this.parseMetricsQuery(rawQuery);
    const where = this.buildMetricsWhereInput(query);
    const [total, categories] = await Promise.all([
      this.fundsRepository.countMany(where),
      this.fundsRepository.getCatalogCategoryMetrics(where),
    ]);

    return parseApiResponse(
      fundCatalogMetricsResponseSchema,
      {
        total,
        categories: categories
          .map((category) => ({
            ...category,
            label: INVESTMENT_THEME_LABELS[category.id],
          }))
          .sort((left, right) => left.label.localeCompare(right.label, 'es')),
      },
      'get-fund-catalog-metrics',
    );
  }

  private buildMetricsWhereInput(
    query: FundCatalogMetricsQuery,
  ): Prisma.FundWhereInput {
    const listQuery: FundListQuery = {
      ...query,
      page: 1,
      limit: 1,
      sortBy: 'score',
      sortOrder: 'desc',
    };
    const where = buildFundListWhereInput(listQuery);
    const riskWhere = this.buildRiskProfileWhereInput(query.riskProfile);

    if (riskWhere === null) {
      return where;
    }

    return { AND: [where, riskWhere] };
  }

  private buildRiskProfileWhereInput(
    riskProfile: FundCatalogMetricsQuery['riskProfile'],
  ): Prisma.FundWhereInput | null {
    switch (riskProfile) {
      case 'low':
        return { riskLevel: { gte: 1, lte: 2 } };
      case 'medium':
        return { riskLevel: { gte: 3, lte: 5 } };
      case 'high':
        return { riskLevel: { gte: 6, lte: 7 } };
      case 'all':
        return null;
    }
  }

  private parseMetricsQuery(
    rawQuery: Record<string, unknown>,
  ): FundCatalogMetricsQuery {
    const parsed = fundCatalogMetricsQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid fund catalog metrics query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }
}
