import type { FundVehicleType } from '../../funds/entities/fund.schema';

const ETF_NAME_PATTERN = /\b(ETF|ETN|UCITS)\b/i;

/**
 * Resolves the fund vehicle from FMP search or profile metadata.
 *
 * FMP exposes ETFs through `/stable/etf/*` endpoints and marks traditional
 * mutual funds with the `MUTUAL_FUND` exchange code in search results.
 *
 * @param input - FMP metadata used to infer the trading wrapper.
 */
export function resolveFundVehicleFromFmpMetadata(input: {
  readonly name: string;
  readonly exchange?: string;
}): FundVehicleType {
  const normalizedExchange = input.exchange?.trim().toUpperCase();

  if (normalizedExchange === 'MUTUAL_FUND') {
    return 'mutual-fund';
  }

  if (ETF_NAME_PATTERN.test(input.name)) {
    return 'etf';
  }

  if (normalizedExchange !== undefined && normalizedExchange.length > 0) {
    return 'etf';
  }

  return 'mutual-fund';
}
