/** Result for a single fund processed during a daily sync run. */
export interface FundDailySyncItemResult {
  /** Fund ticker symbol. */
  symbol: string;
  /** Whether metadata and prices were synced successfully. */
  status: 'success' | 'failed';
  /** Whether a new fund row was created during metadata sync. */
  fundCreated?: boolean;
  /** Number of price rows upserted during price sync. */
  pricesSynced?: number;
  /** Whether price sync found no new rows to import. */
  upToDate?: boolean;
  /** Error message when status is `failed`. */
  error?: string;
}

/** Outcome of the automatic scoring step executed after daily fund sync. */
export interface FundDailySyncScoringResult {
  /** Whether scores were recalculated and persisted. */
  status: 'success' | 'failed' | 'skipped';
  /** Number of funds evaluated during scoring. */
  total?: number;
  /** Number of fund scores persisted successfully. */
  updated?: number;
  /** Error message when status is `failed`. */
  error?: string;
}

/** Aggregate result for a daily synchronization run. */
export interface FundDailySyncResult {
  /** Total symbols processed. */
  total: number;
  /** Number of symbols synced successfully. */
  succeeded: number;
  /** Number of symbols that failed. */
  failed: number;
  /** Per-symbol sync outcomes. */
  results: FundDailySyncItemResult[];
  /** Automatic scoring outcome after metadata and price sync. */
  scoring: FundDailySyncScoringResult;
}
