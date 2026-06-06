import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  fmpIndexFundDetailSchema,
  fmpIndexFundHistoricalPriceSchema,
  fmpIndexFundProfileSchema,
  fmpIndexFundSearchResultSchema,
} from '../../providers/financial-modeling-prep/fmp-index-fund.schemas';
import type {
  FmpIndexFundDetail,
  FmpIndexFundHistoricalPrice,
  FmpIndexFundProfile,
  FmpIndexFundSearchResult,
} from '../../providers/financial-modeling-prep/fmp-index-fund.schemas';
import {
  invesoraFundDetailSchema,
  invesoraFundListingSchema,
  invesoraFundMetricsSchema,
  invesoraFundPerformanceSummarySchema,
  invesoraFundPricePointSchema,
  invesoraFundProfileSchema,
  invesoraFundSearchResponseSchema,
} from '../schemas/invesora-fund.schemas';
import type {
  InvesoraFundDetail,
  InvesoraFundListing,
  InvesoraFundMetrics,
  InvesoraFundPerformanceSummary,
  InvesoraFundPricePoint,
  InvesoraFundProfile,
  InvesoraFundSearchResponse,
} from '../schemas/invesora-fund.schemas';
import type { FundDataSource, IFundDataAdapter } from './fund-data.adapter';

/**
 * Adapts Financial Modeling Prep fund payloads into Invesora domain models.
 */
@Injectable()
export class FmpToInvesoraFundAdapter implements IFundDataAdapter {
  /** @inheritdoc */
  readonly source: FundDataSource = 'financial-modeling-prep';

  /** @inheritdoc */
  adaptSearchResults(results: unknown): InvesoraFundListing[] {
    const parsed = z.array(fmpIndexFundSearchResultSchema).parse(results);

    return parsed.map((result) => this.adaptSearchResult(result));
  }

  /** @inheritdoc */
  adaptPriceHistory(prices: unknown): InvesoraFundPricePoint[] {
    const parsed = z.array(fmpIndexFundHistoricalPriceSchema).parse(prices);

    return parsed.map((price) => this.adaptPricePoint(price));
  }

  /** @inheritdoc */
  adaptProfile(profile: unknown): InvesoraFundProfile {
    const parsed = fmpIndexFundProfileSchema.parse(profile);

    return this.adaptProfileRow(parsed);
  }

  /** @inheritdoc */
  adaptDetail(detail: unknown): InvesoraFundDetail {
    const parsed = fmpIndexFundDetailSchema.parse(detail);

    return invesoraFundDetailSchema.parse({
      ...this.adaptProfileRow(parsed),
      performance: this.adaptPerformanceSummary(parsed.priceSummary),
      priceHistory: parsed.history?.map((price) => this.adaptPricePoint(price)),
    });
  }

  /** @inheritdoc */
  adaptSearchResponse(
    listings: InvesoraFundListing[],
  ): InvesoraFundSearchResponse {
    return invesoraFundSearchResponseSchema.parse({
      items: listings,
      source: this.source,
    });
  }

  /**
   * Maps a single FMP search row to an Invesora fund listing.
   *
   * @param result - FMP search row.
   * @returns Invesora fund listing.
   */
  private adaptSearchResult(
    result: FmpIndexFundSearchResult,
  ): InvesoraFundListing {
    return invesoraFundListingSchema.parse({
      symbol: result.symbol,
      name: result.name,
      fundType: 'index',
      currency: result.currency,
      exchangeCode: result.exchange,
      exchangeName: result.exchangeFullName,
    });
  }

  /**
   * Maps a single FMP profile row to an Invesora fund profile.
   *
   * @param profile - FMP profile row.
   * @returns Invesora fund profile.
   */
  private adaptProfileRow(profile: FmpIndexFundProfile): InvesoraFundProfile {
    return invesoraFundProfileSchema.parse({
      symbol: profile.symbol,
      name: profile.name,
      fundType: 'index',
      description: profile.description,
      issuer: profile.issuer,
      benchmark: profile.benchmark,
      assetClass: profile.assetClass,
      domicile: profile.domicile,
      currency: profile.currency,
      exchangeCode: profile.exchange,
      exchangeName: profile.exchangeFullName,
      metrics: this.adaptMetrics(profile),
    });
  }

  /**
   * Maps FMP profile metrics to the Invesora metrics block.
   *
   * @param profile - FMP profile row.
   * @returns Invesora metrics block.
   */
  private adaptMetrics(profile: FmpIndexFundProfile): InvesoraFundMetrics {
    return invesoraFundMetricsSchema.parse({
      expenseRatio: profile.expenseRatio,
      assetsUnderManagement: profile.assetsUnderManagement,
      netAssetValue: profile.nav,
      netAssetValueCurrency: profile.navCurrency,
      holdingsCount: profile.holdingsCount,
      inceptionDate: profile.inceptionDate,
    });
  }

  /**
   * Maps a single FMP historical row to an Invesora price point.
   *
   * @param price - FMP historical row.
   * @returns Invesora price point.
   */
  private adaptPricePoint(
    price: FmpIndexFundHistoricalPrice,
  ): InvesoraFundPricePoint {
    return invesoraFundPricePointSchema.parse({
      date: price.date,
      open: price.open,
      high: price.high,
      low: price.low,
      close: price.close,
      volume: price.volume,
      dailyChange: price.change,
      dailyChangePercent: price.changePercent,
      vwap: price.vwap,
    });
  }

  /**
   * Maps FMP derived price statistics to Invesora performance summary.
   *
   * @param summary - FMP price summary block.
   * @returns Invesora performance summary.
   */
  private adaptPerformanceSummary(
    summary: FmpIndexFundDetail['priceSummary'],
  ): InvesoraFundPerformanceSummary {
    return invesoraFundPerformanceSummarySchema.parse({
      asOfDate: summary.latestDate,
      latestClose: summary.latestClose,
      periodStartDate: summary.periodStartDate,
      periodStartClose: summary.periodStartClose,
      periodReturnPercent: summary.periodReturnPercent,
      periodHigh: summary.periodHigh,
      periodLow: summary.periodLow,
      averageVolume: summary.averageVolume,
    });
  }
}
