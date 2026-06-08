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
  /** Number of holding rows persisted during composition sync. */
  holdingsSynced?: number;
  /** Number of allocation rows persisted during composition sync. */
  allocationsSynced?: number;
  /** Snapshot ISO date persisted for composition data. */
  compositionAsOf?: string;
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

/** Selectable pipeline steps for a manual synchronization run. */
export interface ManualSyncSteps {
  /** Sync fund metadata from the provider. */
  metadata?: boolean;
  /** Sync end-of-day price history. */
  prices?: boolean;
  /** Sync holdings and sector/country exposure allocations. */
  composition?: boolean;
  /** Recalculate and persist Inversora scores. */
  scoring?: boolean;
}

/** Resolved pipeline steps with explicit booleans for each stage. */
export interface ResolvedManualSyncSteps {
  /** Whether fund metadata sync runs. */
  metadata: boolean;
  /** Whether end-of-day price sync runs. */
  prices: boolean;
  /** Whether composition sync runs. */
  composition: boolean;
  /** Whether scoring recalculation runs. */
  scoring: boolean;
}

/** Options for a manual synchronization run triggered via admin API or CLI. */
export interface ManualSyncOptions {
  /** Optional symbol override; defaults to env config or persisted funds. */
  symbols?: readonly string[];
  /** Optional subset of pipeline steps to execute. */
  steps?: ManualSyncSteps;
  /** When true, resumes price sync from the latest persisted date. */
  incrementalPrices?: boolean;
  /** Optional lower bound for provider historical price requests. */
  historyFrom?: string;
  /** Optional upper bound for provider historical price requests. */
  historyTo?: string;
}

/** Execution metadata attached to manual synchronization responses. */
export interface ManualSyncRunMeta {
  /** Unique identifier for correlating logs and responses. */
  runId: string;
  /** ISO timestamp when the run started. */
  startedAt: string;
  /** ISO timestamp when the run finished. */
  finishedAt: string;
  /** Total elapsed time in milliseconds. */
  durationMs: number;
  /** Pipeline steps executed during the run. */
  steps: ResolvedManualSyncSteps;
}

/** Aggregate result for a manual synchronization run. */
export interface ManualSyncResult
  extends FundDailySyncResult, ManualSyncRunMeta {}
