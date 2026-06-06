import { Inject, Injectable } from '@nestjs/common';
import type { IFundDataAdapter } from './adapters/fund-data.adapter';
import { FUND_DATA_ADAPTER } from './funds.tokens';
import type {
  IndexFundDetailOptions,
  IndexFundHistoryOptions,
  SearchIndexFundsOptions,
} from '../providers/financial-modeling-prep/financial-modeling-prep.types';
import { FinancialModelingPrepProvider } from '../providers/financial-modeling-prep/financial-modeling-prep.provider';
import type {
  InvesoraFundDetail,
  InvesoraFundPricePoint,
  InvesoraFundSearchResponse,
} from './schemas/invesora-fund.schemas';

/**
 * Application service that exposes Invesora fund data independent of providers.
 */
@Injectable()
export class FundsService {
  constructor(
    private readonly fmpProvider: FinancialModelingPrepProvider,
    @Inject(FUND_DATA_ADAPTER)
    private readonly fundDataAdapter: IFundDataAdapter,
  ) {}

  /**
   * Searches indexed funds and returns the unified Invesora response model.
   *
   * @param query - Partial fund name or ticker symbol.
   * @param options - Optional search constraints.
   * @returns Unified Invesora search response.
   */
  async searchIndexFunds(
    query: string,
    options?: SearchIndexFundsOptions,
  ): Promise<InvesoraFundSearchResponse> {
    const providerResults = await this.fmpProvider.searchIndexFunds(
      query,
      options,
    );
    const listings = this.fundDataAdapter.adaptSearchResults(providerResults);

    return this.fundDataAdapter.adaptSearchResponse(listings);
  }

  /**
   * Retrieves normalized historical prices for an index fund.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional date range filters.
   * @returns Invesora price points sorted by date descending.
   */
  async getIndexFundHistory(
    symbol: string,
    options?: IndexFundHistoryOptions,
  ): Promise<InvesoraFundPricePoint[]> {
    const providerHistory = await this.fmpProvider.getIndexFundHistory(
      symbol,
      options,
    );

    return this.fundDataAdapter.adaptPriceHistory(providerHistory);
  }

  /**
   * Retrieves the richest available Invesora snapshot for an index fund.
   *
   * @param symbol - Fund ticker symbol.
   * @param options - Optional date filters and history inclusion flag.
   * @returns Unified Invesora fund detail aggregate.
   */
  async getIndexFundDetail(
    symbol: string,
    options?: IndexFundDetailOptions,
  ): Promise<InvesoraFundDetail> {
    const providerDetail = await this.fmpProvider.getIndexFundDetail(
      symbol,
      options,
    );

    return this.fundDataAdapter.adaptDetail(providerDetail);
  }
}
