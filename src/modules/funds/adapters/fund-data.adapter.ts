import type {
  InvesoraFundDetail,
  InvesoraFundListing,
  InvesoraFundPricePoint,
  InvesoraFundProfile,
  InvesoraFundSearchResponse,
} from '../schemas/invesora-fund.schemas';

/** External data source identifier for fund adapters. */
export type FundDataSource = 'financial-modeling-prep';

/**
 * Port that adapts external fund provider payloads into Invesora models.
 */
export interface IFundDataAdapter {
  /** External provider identifier. */
  readonly source: FundDataSource;

  /**
   * Adapts provider search rows into Invesora fund listings.
   *
   * @param results - Provider-specific search rows.
   * @returns Invesora fund listings.
   */
  adaptSearchResults(results: unknown): InvesoraFundListing[];

  /**
   * Adapts provider historical prices into Invesora price points.
   *
   * @param prices - Provider-specific historical rows.
   * @returns Invesora price points.
   */
  adaptPriceHistory(prices: unknown): InvesoraFundPricePoint[];

  /**
   * Adapts a provider profile payload into an Invesora fund profile.
   *
   * @param profile - Provider-specific profile row.
   * @returns Invesora fund profile.
   */
  adaptProfile(profile: unknown): InvesoraFundProfile;

  /**
   * Adapts a provider detail aggregate into an Invesora fund detail.
   *
   * @param detail - Provider-specific detail aggregate.
   * @returns Invesora fund detail.
   */
  adaptDetail(detail: unknown): InvesoraFundDetail;

  /**
   * Wraps adapted listings in a search response envelope.
   *
   * @param listings - Adapted fund listings.
   * @returns Unified Invesora search response.
   */
  adaptSearchResponse(listings: InvesoraFundListing[]): InvesoraFundSearchResponse;
}
