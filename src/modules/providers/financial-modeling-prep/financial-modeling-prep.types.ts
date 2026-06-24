/**
 * Options for {@link FinancialModelingPrepProvider.searchIndexedProducts}.
 */
export interface SearchIndexedProductsOptions {
  /** Maximum number of results to return after filtering indexed products. */
  readonly limit?: number;
}

/**
 * Options for historical provider fund price queries.
 */
export interface ProviderFundHistoryOptions {
  /** Inclusive start date in `YYYY-MM-DD` format. */
  readonly from?: string;

  /** Inclusive end date in `YYYY-MM-DD` format. */
  readonly to?: string;
}

/**
 * Options for {@link FinancialModelingPrepProvider.getFundDetail}.
 */
export interface ProviderFundDetailOptions extends ProviderFundHistoryOptions {
  /** When `true`, includes the full historical series in the response. */
  readonly includeHistory?: boolean;
}
