import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import type {
  IndexFundDetail,
  IndexFundHistoricalPrice,
  IndexFundProfile,
  IndexFundSearchResult,
} from './financial-modeling-prep.domain.schemas';
import { FinancialModelingPrepClient } from './financial-modeling-prep.client';
import { FMP_PROVIDER_NAME } from './financial-modeling-prep.constants';
import {
  FMP_FIXTURE_FILES,
  FinancialModelingPrepFixtureService,
} from './financial-modeling-prep.fixture.service';
import {
  buildIndexFundDetail,
  normalizeIndexFundHistoricalPrices,
  normalizeIndexFundProfile,
  normalizeIndexFundProfileFromSearch,
  normalizeIndexFundSearchResults,
} from './financial-modeling-prep.normalizers';
import {
  fmpFundProfileSchema,
  fmpHistoricalPriceSchema,
  fmpSearchResultSchema,
} from './financial-modeling-prep.raw.schemas';
import type {
  FmpHistoricalPrice,
  FmpSearchResult,
} from './financial-modeling-prep.raw.schemas';
import type {
  IndexFundDetailOptions,
  IndexFundHistoryOptions,
  SearchIndexFundsOptions,
} from './financial-modeling-prep.types';

/**
 * Outbound provider for indexed fund discovery, profiles, and historical data.
 */
@Injectable()
export class FinancialModelingPrepProvider {
  constructor(
    private readonly config: AppConfigService,
    private readonly client: FinancialModelingPrepClient,
    private readonly fixtures: FinancialModelingPrepFixtureService,
  ) {}

  /**
   * Searches indexed ETFs and mutual funds by name or ticker symbol.
   *
   * @param query - Partial fund name or ticker symbol.
   * @param options - Optional search constraints.
   * @returns Matching normalized index fund search results.
   */
  async searchIndexFunds(
    query: string,
    options?: SearchIndexFundsOptions,
  ): Promise<IndexFundSearchResult[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const rawResults = this.config.fmpUsesMocks
      ? await this.searchIndexFundsFromFixture(normalizedQuery)
      : await this.searchIndexFundsFromLiveApi(normalizedQuery);

    const normalizedResults = normalizeIndexFundSearchResults(rawResults);

    if (options?.limit === undefined) {
      return normalizedResults;
    }

    return normalizedResults.slice(0, options.limit);
  }

  /**
   * Retrieves end-of-day historical prices for an index fund.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional date range filters.
   * @returns Normalized historical price points sorted by date descending.
   */
  async getIndexFundHistory(
    symbol: string,
    options?: IndexFundHistoryOptions,
  ): Promise<IndexFundHistoricalPrice[]> {
    const rawPrices = await this.loadHistoricalPrices(symbol, options);

    return normalizeIndexFundHistoricalPrices(rawPrices);
  }

  /**
   * Retrieves the richest available index fund snapshot for a symbol.
   *
   * Combines profile metadata with derived statistics from the historical window.
   * In live mode this may require up to two API calls when the paid profile
   * endpoint is unavailable on the current FMP plan.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional date filters and history inclusion flag.
   * @returns Index fund detail aggregate.
   */
  async getIndexFundDetail(
    symbol: string,
    options?: IndexFundDetailOptions,
  ): Promise<IndexFundDetail> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const [profile, rawPrices] = await Promise.all([
      this.resolveIndexFundProfile(normalizedSymbol),
      this.loadHistoricalPrices(normalizedSymbol, options),
    ]);
    const history = normalizeIndexFundHistoricalPrices(rawPrices);

    if (history.length === 0) {
      throw new ExternalHttpError({
        message: `Historical data not found for index fund ${normalizedSymbol}`,
        provider: FMP_PROVIDER_NAME,
        statusCode: 404,
      });
    }

    return buildIndexFundDetail(
      profile,
      history,
      options?.includeHistory ?? false,
    );
  }

  private async resolveIndexFundProfile(
    symbol: string,
  ): Promise<IndexFundProfile> {
    const searchResult = await this.findSearchResultBySymbol(symbol);

    if (this.config.fmpUsesMocks) {
      const rawProfiles = await this.getFixtureArray(
        FMP_FIXTURE_FILES.etfInfo,
        fmpFundProfileSchema,
        'etf/info',
      );
      const profile = rawProfiles.find(
        (entry) => entry.symbol.toUpperCase() === symbol,
      );

      if (profile !== undefined) {
        return normalizeIndexFundProfile(profile, searchResult);
      }
    } else {
      try {
        const rawProfiles = await this.client.fetchFundProfile(symbol);
        const profile = rawProfiles.find(
          (entry) => entry.symbol.toUpperCase() === symbol,
        );

        if (profile !== undefined) {
          return normalizeIndexFundProfile(profile, searchResult);
        }
      } catch (error: unknown) {
        if (!this.isPaidEndpointError(error)) {
          throw error;
        }
      }
    }

    if (searchResult === undefined) {
      throw new ExternalHttpError({
        message: `Index fund profile not found for symbol ${symbol}`,
        provider: FMP_PROVIDER_NAME,
        statusCode: 404,
      });
    }

    return normalizeIndexFundProfileFromSearch(searchResult);
  }

  private async findSearchResultBySymbol(
    symbol: string,
  ): Promise<FmpSearchResult | undefined> {
    const rawResults = this.config.fmpUsesMocks
      ? this.parseArray(
          this.fixtures.filterSearchFixture(
            await this.fixtures.readFixture(FMP_FIXTURE_FILES.searchSymbol),
            symbol,
          ),
          fmpSearchResultSchema,
          'search-symbol',
        )
      : await this.client.searchBySymbol(symbol);

    return rawResults.find(
      (result) => result.symbol.toUpperCase() === symbol,
    );
  }

  private async loadHistoricalPrices(
    symbol: string,
    options?: IndexFundHistoryOptions,
  ): Promise<FmpHistoricalPrice[]> {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (this.config.fmpUsesMocks) {
      const fixture = await this.fixtures.readFixture(
        FMP_FIXTURE_FILES.historicalPriceEod,
      );
      const filtered = this.fixtures.filterHistoricalFixture(
        fixture,
        options?.from,
        options?.to,
      );

      return this.parseArray(
        filtered,
        fmpHistoricalPriceSchema,
        'historical-price-eod/full',
      );
    }

    return this.client.fetchHistoricalData(normalizedSymbol, options);
  }

  private async searchIndexFundsFromLiveApi(
    query: string,
  ): Promise<FmpSearchResult[]> {
    if (this.isTickerLikeQuery(query)) {
      return this.client.searchBySymbol(query);
    }

    return this.client.searchByName(query);
  }

  private async searchIndexFundsFromFixture(
    query: string,
  ): Promise<FmpSearchResult[]> {
    const fixtureFileName = this.isTickerLikeQuery(query)
      ? FMP_FIXTURE_FILES.searchSymbol
      : FMP_FIXTURE_FILES.searchName;
    const fixture = await this.fixtures.readFixture(fixtureFileName);
    const filtered = this.fixtures.filterSearchFixture(fixture, query);

    return this.parseArray(filtered, fmpSearchResultSchema, 'search');
  }

  private async getFixtureArray<TSchema extends z.ZodTypeAny>(
    fileName: string,
    schema: TSchema,
    endpoint: string,
  ): Promise<z.infer<TSchema>[]> {
    const fixture = await this.fixtures.readFixture(fileName);

    return this.parseArray(fixture, schema, endpoint);
  }

  private parseArray<TSchema extends z.ZodTypeAny>(
    data: unknown,
    schema: TSchema,
    endpoint: string,
  ): z.infer<TSchema>[] {
    const arraySchema = z.array(schema);
    const parsed = arraySchema.safeParse(data);

    if (!parsed.success) {
      throw new ExternalHttpError({
        message: `Invalid response format from FMP ${endpoint}`,
        provider: FMP_PROVIDER_NAME,
        cause: parsed.error,
      });
    }

    return parsed.data;
  }

  private isTickerLikeQuery(query: string): boolean {
    return !/\s/.test(query) && query.length <= 10;
  }

  private isPaidEndpointError(error: unknown): boolean {
    return (
      error instanceof ExternalHttpError &&
      (error.statusCode === 402 || error.statusCode === 403)
    );
  }
}
