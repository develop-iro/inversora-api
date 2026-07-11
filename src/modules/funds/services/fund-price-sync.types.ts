/** Options for syncing fund price history from Financial Modeling Prep. */
export interface FundPriceSyncOptions {
  /** Inclusive lower bound for provider historical price requests. */
  from?: string;
  /** Inclusive upper bound for provider historical price requests. */
  to?: string;
  /**
   * When true, resumes from the day after the latest persisted price.
   * Defaults to `true`.
   */
  incremental?: boolean;
}

/** Result of a fund price history synchronization run. */
export interface FundPriceSyncResult {
  /** Persisted fund identifier. */
  fundId: string;
  /** Fund ticker symbol. */
  symbol: string;
  /** Number of price rows upserted. */
  pricesSynced: number;
  /** Number of price rows deleted by the retention policy. */
  pricesPruned: number;
  /** Effective lower bound used for the provider request, if any. */
  from?: string;
  /** Effective upper bound used for the provider request, if any. */
  to?: string;
  /** Whether the fund already had the requested window persisted. */
  upToDate: boolean;
}
