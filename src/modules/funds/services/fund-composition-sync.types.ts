/** Result of a fund composition synchronization run. */
export interface FundCompositionSyncResult {
  /** Persisted fund identifier. */
  fundId: string;
  /** Fund ticker symbol. */
  symbol: string;
  /** Snapshot ISO date persisted for the composition. */
  asOf: string;
  /** Number of holding rows persisted. */
  holdingsSynced: number;
  /** Number of allocation rows persisted. */
  allocationsSynced: number;
}
