import { z } from 'zod';

/** ISO 6166 ISIN pattern used by fund route parameters. */
export const FUND_ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Zod schema for a normalized fund ISIN route parameter. */
export const fundIsinParamSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(FUND_ISIN_REGEX, 'Invalid ISIN format'));

/**
 * Returns whether a route identifier looks like an ISIN rather than a UUID.
 *
 * @param identifier - Raw route parameter value.
 */
export function isFundIsinIdentifier(identifier: string): boolean {
  const normalized = identifier.trim().toUpperCase();
  return FUND_ISIN_REGEX.test(normalized);
}

/**
 * Normalizes a validated ISIN route parameter to uppercase.
 *
 * @param isin - Raw ISIN route parameter.
 */
export function normalizeFundIsin(isin: string): string {
  return fundIsinParamSchema.parse(isin);
}
