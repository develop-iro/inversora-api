/** Pattern for non-US exchange suffixes on FMP symbols (for example `IWDA.L`). */
const NON_US_LISTED_SYMBOL_PATTERN = /\.[A-Z]{1,3}$/;

/**
 * Returns whether a ticker is listed outside the US coverage of FMP Starter EOD.
 *
 * @param symbol - Fund ticker symbol.
 * @returns `true` when the symbol includes a non-US exchange suffix.
 */
export function isNonUsListedSymbol(symbol: string): boolean {
  return NON_US_LISTED_SYMBOL_PATTERN.test(symbol.trim().toUpperCase());
}

/**
 * Normalizes and deduplicates ticker symbols while preserving first-seen order.
 *
 * @param symbols - Raw symbol list.
 * @returns Unique uppercase symbols.
 */
export function dedupeSymbols(symbols: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
