import type { Fund } from '../entities/fund.schema';

/** Options for syncing a fund from Financial Modeling Prep. */
export interface FundSyncOptions {
  /** When true, persists normalized historical prices returned by the provider. */
  includePrices?: boolean;
  /** Optional lower bound for provider historical price requests. */
  historyFrom?: string;
  /** Optional upper bound for provider historical price requests. */
  historyTo?: string;
}

/** Result of a single fund synchronization run. */
export interface FundSyncResult {
  /** Persisted fund entity after upsert. */
  fund: Fund;
  /** Whether a new fund row was created. */
  created: boolean;
  /** Number of price rows persisted when price sync is enabled. */
  pricesSynced?: number;
}
