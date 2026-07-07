import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { parseApiResponse } from '../../../core/api/parse-api-response';
import {
  fundLiveMarketSnapshotSchema,
  type FundLiveMarketSnapshot,
} from '../../../core/api/schemas/fund-live-market-snapshot.schema';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { normalizeFundIsin } from '../entities/fund-isin.utils';

const LIVE_MARKET_CACHE_TTL_MS = 60 * 1000;
const DATA_SOURCE_LABEL = 'Financial Modeling Prep';
const EOD_SOURCE_LABEL = `${DATA_SOURCE_LABEL} (cierre)`;

type LiveMarketCacheEntry = {
  expiresAt: number;
  snapshot: FundLiveMarketSnapshot;
};

/**
 * Resolves live or latest end-of-day market snapshots for fund detail screens.
 */
@Injectable()
export class FundLiveMarketSnapshotService {
  private readonly logger = new Logger(FundLiveMarketSnapshotService.name);
  private readonly cache = new Map<string, LiveMarketCacheEntry>();

  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly catalogVisibilityService: CatalogVisibilityService,
    private readonly fundPricesService: FundPricesService,
    private readonly fmpProvider: FinancialModelingPrepProvider,
  ) {}

  /**
   * Returns a live quote when available, otherwise the latest persisted EOD price.
   *
   * @param rawIsin - Raw ISIN route parameter.
   */
  async getByIsin(rawIsin: string): Promise<FundLiveMarketSnapshot> {
    let isin: string;

    try {
      isin = normalizeFundIsin(rawIsin);
    } catch {
      throw new BadRequestException({
        message: 'Invalid ISIN format',
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const fund = await this.fundsRepository.findByIsin(isin);

    if (fund === null || fund.isin === null) {
      throw new NotFoundException({
        message: 'Fund not found',
        error: 'Not Found',
        statusCode: 404,
      });
    }

    this.catalogVisibilityService.assertPublicCatalogVisible(fund);

    const cacheKey = `${fund.isin}:${fund.symbol}`;
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.snapshot;
    }

    const snapshot = await this.resolveSnapshot(
      fund.isin,
      fund.symbol,
      fund.id,
    );
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + LIVE_MARKET_CACHE_TTL_MS,
      snapshot,
    });

    return parseApiResponse(
      fundLiveMarketSnapshotSchema,
      snapshot,
      'get-fund-live-market-snapshot',
    );
  }

  private async resolveSnapshot(
    isin: string,
    symbol: string,
    fundId: string,
  ): Promise<FundLiveMarketSnapshot> {
    try {
      const quote = await this.fmpProvider.getFundQuote(symbol);

      if (quote !== null) {
        return {
          isin,
          symbol,
          price: quote.price,
          changePercent: quote.changePercent,
          asOf: quote.asOf,
          freshness: 'live',
          sourceLabel: DATA_SOURCE_LABEL,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Live quote unavailable for ${symbol}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    const latestDate = await this.fundPricesService.getLatestDate(fundId);

    if (latestDate !== null) {
      const history = await this.fundPricesService.getHistory(fundId, {
        from: latestDate,
        to: latestDate,
      });
      const latest = history.at(-1);

      if (latest !== undefined) {
        return {
          isin,
          symbol,
          price: latest.close,
          changePercent: latest.changePercent,
          asOf: `${latest.date}T00:00:00.000Z`,
          freshness: 'eod',
          sourceLabel: EOD_SOURCE_LABEL,
        };
      }
    }

    return {
      isin,
      symbol,
      price: null,
      changePercent: null,
      asOf: new Date().toISOString(),
      freshness: 'unavailable',
      sourceLabel: DATA_SOURCE_LABEL,
    };
  }
}
