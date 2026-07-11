import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { resolveFeaturedSelectionForQuarter } from '../config/featured-funds-selection.config';
import {
  buildFeaturedFundsResponse,
  FeaturedQuarterParseError,
  filterFeaturedFunds,
  mapFundToFeaturedFund,
  parseFeaturedQuarterQuery,
} from '../entities/featured-funds.mapper';
import {
  featuredFundsQuerySchema,
  type FeaturedFundsQuery,
  type FeaturedFundsResponse,
} from '../entities/featured-funds.schema';
import {
  buildQuarterMetadata,
  parseQuarterKey,
} from '../entities/quarter-metadata.utils';
import { isCatalogVisible } from '../../funds/entities/catalog-visibility.schema';
import {
  loadReturnSnapshotsByFundIds,
  resolveFundReturnSnapshot,
} from '../../funds/entities/fund-returns.enricher';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { AppConfigService } from '../../../shared/config/config.service';

const FEATURED_FUNDS_CACHE_TTL_MS = 5 * 60 * 1000;

type FeaturedFundsCacheEntry = {
  expiresAt: number;
  response: FeaturedFundsResponse;
};

/**
 * Application service for quarterly featured fund selections.
 */
@Injectable()
export class FeaturedFundsService {
  private readonly cache = new Map<string, FeaturedFundsCacheEntry>();

  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly configService: AppConfigService,
    private readonly fundPricesService: FundPricesService,
  ) {}

  /**
   * Returns featured funds for the requested quarter, hydrated from PostgreSQL.
   *
   * Selection is manually curated per quarter (see `featured-funds-selection.config.ts`).
   * Unknown or unconfigured quarters return HTTP 200 with an empty `data` array.
   *
   * @param rawQuery - Raw HTTP query parameters.
   */
  async getFeaturedFunds(
    rawQuery: Record<string, unknown>,
  ): Promise<FeaturedFundsResponse> {
    const query = this.parseFeaturedFundsQuery(rawQuery);
    const quarterWasExplicit = this.isQuarterExplicitlyRequested(rawQuery);
    const requestedQuarter = parseFeaturedQuarterQuery(query.quarter);
    const selection = resolveFeaturedSelectionForQuarter(
      requestedQuarter.quarterKey,
      { allowLatestFallback: !quarterWasExplicit },
    );
    const effectiveQuarter =
      selection !== undefined
        ? buildQuarterMetadata(parseQuarterKey(selection.quarterKey))
        : requestedQuarter;
    const cacheKey = this.buildCacheKey(effectiveQuarter.quarterKey, query);
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    if (selection === undefined) {
      const emptyResponse = buildFeaturedFundsResponse(requestedQuarter, []);
      this.storeCacheEntry(cacheKey, emptyResponse);
      return emptyResponse;
    }

    const isins = selection.entries.map((entry) => entry.isin);
    const fundsByIsin = await this.fundsRepository.findByIsins(isins);
    const hydrated = selection.entries.flatMap((editorial) => {
      const fund = fundsByIsin.get(editorial.isin);

      if (fund === undefined || fund.isin === null || !isCatalogVisible(fund)) {
        return [];
      }

      if ((fund.score ?? 0) < 30) {
        return [];
      }

      return [
        mapFundToFeaturedFund({
          fund,
          editorial,
          quarter: effectiveQuarter,
          brandfetchClientId: this.configService.brandfetchClientId,
        }),
      ];
    });

    const filtered = filterFeaturedFunds(hydrated, query);
    const fundIds = filtered.map((entry) => entry.id);
    const returnSnapshots = await loadReturnSnapshotsByFundIds(
      this.fundPricesService,
      fundIds,
    );
    const enriched = filtered.map((entry) => ({
      ...entry,
      returns: resolveFundReturnSnapshot(returnSnapshots, entry.id),
    }));

    const response = buildFeaturedFundsResponse(effectiveQuarter, enriched);
    this.storeCacheEntry(cacheKey, response);
    return response;
  }

  private isQuarterExplicitlyRequested(
    rawQuery: Record<string, unknown>,
  ): boolean {
    const rawQuarter = rawQuery.quarter;

    return typeof rawQuarter === 'string' && rawQuarter.trim().length > 0;
  }

  private parseFeaturedFundsQuery(
    rawQuery: Record<string, unknown>,
  ): FeaturedFundsQuery {
    const parsed = featuredFundsQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid featured funds query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    try {
      if (parsed.data.quarter !== undefined) {
        parseFeaturedQuarterQuery(parsed.data.quarter);
      }
    } catch (error) {
      if (error instanceof FeaturedQuarterParseError) {
        throw new BadRequestException({
          message: error.message,
          issues: {
            quarter: [
              'Use YYYY-QN (e.g. 2026-Q2) or display format QN YYYY (e.g. Q2 2026).',
            ],
          },
        });
      }

      throw error;
    }

    return parsed.data;
  }

  private buildCacheKey(quarterKey: string, query: FeaturedFundsQuery): string {
    return [
      quarterKey,
      query.benchmark ?? '',
      query.mercado ?? '',
      query.limit?.toString() ?? '',
    ].join('|');
  }

  private storeCacheEntry(
    cacheKey: string,
    response: FeaturedFundsResponse,
  ): void {
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + FEATURED_FUNDS_CACHE_TTL_MS,
      response,
    });
  }
}
