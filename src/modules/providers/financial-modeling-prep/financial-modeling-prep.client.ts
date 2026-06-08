import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { HttpClientService } from '../../../shared/http/http-client.service';
import type { HttpQueryParamValue } from '../../../shared/http/http-client.types';
import {
  FMP_DEFAULT_BASE_URL,
  FMP_PROVIDER_NAME,
} from './financial-modeling-prep.constants';
import {
  FMP_FIXTURE_FILES,
  FinancialModelingPrepFixtureService,
} from './financial-modeling-prep.fixture.service';
import {
  fmpCountryWeightingSchema,
  fmpFundHoldingSchema,
  fmpFundProfileSchema,
  fmpHistoricalPriceSchema,
  fmpSearchResultSchema,
  fmpSectorWeightingSchema,
} from './financial-modeling-prep.raw.schemas';
import type {
  FmpCountryWeighting,
  FmpFundHolding,
  FmpFundProfile,
  FmpHistoricalPrice,
  FmpSearchResult,
  FmpSectorWeighting,
} from './financial-modeling-prep.raw.schemas';
import type { IndexFundHistoryOptions } from './financial-modeling-prep.types';

/**
 * Low-level HTTP client for live Financial Modeling Prep requests.
 */
@Injectable()
export class FinancialModelingPrepClient {
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly config: AppConfigService,
    private readonly fixtures: FinancialModelingPrepFixtureService,
  ) {}

  /**
   * Executes a symbol-oriented FMP search request.
   *
   * @param query - Partial ticker symbol.
   * @returns Raw FMP search rows.
   */
  async searchBySymbol(query: string): Promise<FmpSearchResult[]> {
    return this.fetchArray(
      '/stable/search-symbol',
      { query },
      fmpSearchResultSchema,
      'search-symbol',
      FMP_FIXTURE_FILES.searchSymbol,
    );
  }

  /**
   * Executes a name-oriented FMP search request.
   *
   * @param query - Partial fund or company name.
   * @returns Raw FMP search rows.
   */
  async searchByName(query: string): Promise<FmpSearchResult[]> {
    return this.fetchArray(
      '/stable/search-name',
      { query },
      fmpSearchResultSchema,
      'search-name',
      FMP_FIXTURE_FILES.searchName,
    );
  }

  /**
   * Fetches raw ETF or mutual fund profile data.
   *
   * @param symbol - Fund ticker symbol.
   * @returns Raw FMP profile rows.
   */
  async fetchFundProfile(symbol: string): Promise<FmpFundProfile[]> {
    return this.fetchArray(
      '/stable/etf/info',
      { symbol },
      fmpFundProfileSchema,
      'etf/info',
      FMP_FIXTURE_FILES.etfInfo,
    );
  }

  /**
   * Fetches raw ETF or mutual fund holdings.
   *
   * @param symbol - Fund ticker symbol.
   * @returns Raw FMP holding rows.
   */
  async fetchEtfHoldings(symbol: string): Promise<FmpFundHolding[]> {
    return this.fetchArray(
      '/stable/etf/holdings',
      { symbol },
      fmpFundHoldingSchema,
      'etf/holdings',
      FMP_FIXTURE_FILES.etfHoldings,
    );
  }

  /**
   * Fetches raw ETF sector weightings.
   *
   * @param symbol - Fund ticker symbol.
   * @returns Raw FMP sector weighting rows.
   */
  async fetchEtfSectorWeightings(
    symbol: string,
  ): Promise<FmpSectorWeighting[]> {
    return this.fetchArray(
      '/stable/etf/sector-weightings',
      { symbol },
      fmpSectorWeightingSchema,
      'etf/sector-weightings',
      FMP_FIXTURE_FILES.etfSectorWeightings,
    );
  }

  /**
   * Fetches raw ETF country weightings.
   *
   * @param symbol - Fund ticker symbol.
   * @returns Raw FMP country weighting rows.
   */
  async fetchEtfCountryWeightings(
    symbol: string,
  ): Promise<FmpCountryWeighting[]> {
    return this.fetchArray(
      '/stable/etf/country-weightings',
      { symbol },
      fmpCountryWeightingSchema,
      'etf/country-weightings',
      FMP_FIXTURE_FILES.etfCountryWeightings,
    );
  }

  /**
   * Fetches raw end-of-day historical prices.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional date filters.
   * @returns Raw FMP historical rows.
   */
  async fetchHistoricalData(
    symbol: string,
    options?: IndexFundHistoryOptions,
  ): Promise<FmpHistoricalPrice[]> {
    const params: Record<string, HttpQueryParamValue> = { symbol };

    if (options?.from !== undefined) {
      params.from = options.from;
    }

    if (options?.to !== undefined) {
      params.to = options.to;
    }

    return this.fetchArray(
      '/stable/historical-price-eod/full',
      params,
      fmpHistoricalPriceSchema,
      'historical-price-eod/full',
      FMP_FIXTURE_FILES.historicalPriceEod,
    );
  }

  private async fetchArray<TSchema extends z.ZodTypeAny>(
    path: string,
    params: Record<string, HttpQueryParamValue>,
    schema: TSchema,
    endpoint: string,
    fixtureFileName: string,
  ): Promise<z.infer<TSchema>[]> {
    const response = await this.httpClient.get<unknown>(this.buildUrl(path), {
      provider: FMP_PROVIDER_NAME,
      params: this.buildAuthenticatedParams(params),
    });

    const parsed = this.parseArrayResponse(response.data, schema, endpoint);

    await this.fixtures.saveFixtureIfEnabled(fixtureFileName, response.data);

    return parsed;
  }

  private buildUrl(path: string): string {
    const baseUrl = this.config.fmpBaseUrl ?? FMP_DEFAULT_BASE_URL;

    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  private buildAuthenticatedParams(
    params: Record<string, HttpQueryParamValue>,
  ): Record<string, HttpQueryParamValue> {
    return {
      ...params,
      apikey: this.config.fmpApiKey,
    };
  }

  private parseArrayResponse<TSchema extends z.ZodTypeAny>(
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
}
