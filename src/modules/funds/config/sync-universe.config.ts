/**
 * UCITS and other non-US symbols merged into every discovery/sync universe.
 *
 * FMP `etf-list` is US-centric (~6k tickers, no `.L`/`.DE` rows). These symbols
 * are maintained manually until a European data provider is integrated.
 */
export const CURATED_NON_US_SYNC_SYMBOLS: readonly string[] = [
  'IWDA.L',
  'CSPX.L',
  'VWCE.DE',
];
