/** Result for a single fund processed during a scoring sync run. */
export interface ScoringSyncItemResult {
  /** Persisted fund identifier. */
  fundId: string;
  /** Fund ticker symbol. */
  symbol: string;
  /** Computed Invesora Score persisted to the fund row. */
  score: number;
}

/** Aggregate result for a batch scoring synchronization run. */
export interface ScoringSyncResult {
  /** Total funds processed. */
  total: number;
  /** Number of fund scores persisted successfully. */
  updated: number;
  /** Per-fund scoring outcomes. */
  results: ScoringSyncItemResult[];
}
