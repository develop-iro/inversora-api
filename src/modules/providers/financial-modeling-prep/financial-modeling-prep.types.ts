/**
 * Options for {@link FinancialModelingPrepProvider.searchIndexFunds}.
 */
export interface SearchIndexFundsOptions {
  /** Maximum number of results to return after filtering index funds. */
  readonly limit?: number;
}

/**
 * Options for historical index fund price queries.
 */
export interface IndexFundHistoryOptions {
  /** Inclusive start date in `YYYY-MM-DD` format. */
  readonly from?: string;

  /** Inclusive end date in `YYYY-MM-DD` format. */
  readonly to?: string;
}

/**
 * Options for {@link FinancialModelingPrepProvider.getIndexFundDetail}.
 */
export interface IndexFundDetailOptions extends IndexFundHistoryOptions {
  /** When `true`, includes the full historical series in the response. */
  readonly includeHistory?: boolean;
}
