import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  findFeaturedSelectionByQuarterKey,
  listFeaturedSelectionsNewestFirst,
  resolveFeaturedSelectionForQuarter,
} from '../config/featured-funds-selection.config';
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
  type FeaturedQuarterSelection,
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
import { ScoringService } from '../../scoring/services/scoring.service';
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
    private readonly scoringService: ScoringService,
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

    if (quarterWasExplicit) {
      const selection = findFeaturedSelectionByQuarterKey(
        requestedQuarter.quarterKey,
      );

      if (selection === undefined) {
        const emptyResponse = buildFeaturedFundsResponse(requestedQuarter, []);
        return emptyResponse;
      }

      const effectiveQuarter = buildQuarterMetadata(
        parseQuarterKey(selection.quarterKey),
      );

      return this.buildFeaturedFundsResponse(
        selection,
        effectiveQuarter,
        query,
      );
    }

    const selectionAttempts = this.buildDefaultSelectionAttempts(
      requestedQuarter.quarterKey,
    );

    for (const selection of selectionAttempts) {
      const effectiveQuarter = buildQuarterMetadata(
        parseQuarterKey(selection.quarterKey),
      );
      const response = await this.buildFeaturedFundsResponse(
        selection,
        effectiveQuarter,
        query,
      );

      if (response.data.length > 0) {
        return response;
      }
    }

    const emptyResponse = buildFeaturedFundsResponse(requestedQuarter, []);
    return emptyResponse;
  }

  /**
   * Builds the ordered list of curated selections to try for default requests.
   *
   * Starts at the requested UTC quarter when configured, then walks back to
   * older quarters until hydrated data is found.
   *
   * @param requestedQuarterKey - Canonical quarter key for the default request.
   */
  private buildDefaultSelectionAttempts(
    requestedQuarterKey: string,
  ): readonly FeaturedQuarterSelection[] {
    const sortedSelections = listFeaturedSelectionsNewestFirst();
    const requestedIndex = sortedSelections.findIndex(
      (selection) => selection.quarterKey === requestedQuarterKey,
    );

    if (requestedIndex >= 0) {
      return sortedSelections.slice(requestedIndex);
    }

    const fallbackSelection = resolveFeaturedSelectionForQuarter(
      requestedQuarterKey,
      { allowLatestFallback: true },
    );

    if (fallbackSelection === undefined) {
      return [];
    }

    const fallbackIndex = sortedSelections.findIndex(
      (selection) => selection.quarterKey === fallbackSelection.quarterKey,
    );

    return fallbackIndex >= 0
      ? sortedSelections.slice(fallbackIndex)
      : [fallbackSelection];
  }

  /**
   * Hydrates, filters, enriches, and caches a curated quarter selection.
   *
   * @param selection - Manual quarter curation config.
   * @param effectiveQuarter - Quarter metadata served to clients.
   * @param query - Parsed featured funds query.
   */
  private async buildFeaturedFundsResponse(
    selection: FeaturedQuarterSelection,
    effectiveQuarter: ReturnType<typeof buildQuarterMetadata>,
    query: FeaturedFundsQuery,
  ): Promise<FeaturedFundsResponse> {
    const cacheKey = this.buildCacheKey(effectiveQuarter.quarterKey, query);
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    const isins = selection.entries.map((entry) => entry.isin);
    const fundsByIsin = await this.fundsRepository.findByIsins(isins);
    const visibleFunds = selection.entries.flatMap((editorial) => {
      const fund = fundsByIsin.get(editorial.isin);

      if (fund === undefined || fund.isin === null || !isCatalogVisible(fund)) {
        return [];
      }

      return [{ fund, editorial }];
    });
    const liveScores = await this.scoringService.calculateScoresForFundIds(
      visibleFunds.map(({ fund }) => fund.id),
    );
    const hydrated = visibleFunds.flatMap(({ fund, editorial }) => {
      const efficiencyScore =
        liveScores.get(fund.id) ?? Math.round(fund.score ?? 0);

      if (efficiencyScore < 30) {
        return [];
      }

      return [
        mapFundToFeaturedFund({
          fund,
          editorial,
          quarter: effectiveQuarter,
          brandfetchClientId: this.configService.brandfetchClientId,
          efficiencyScore,
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
