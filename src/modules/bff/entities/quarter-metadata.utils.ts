import { formatFundPriceDate } from '../../funds/entities/fund-price.mapper';

/** Canonical quarter key format accepted by `GET /featured`. */
export const QUARTER_KEY_REGEX = /^(\d{4})-Q([1-4])$/;

/** Parsed quarter parts used across BFF mappers. */
export type QuarterParts = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
};

/** Quarter metadata exposed to mobile clients. */
export type QuarterMetadata = QuarterParts & {
  quarterKey: string;
  quarterTag: string;
  periodStart: string;
  periodEnd: string;
};

/**
 * Builds the canonical quarter key (`YYYY-QN`).
 *
 * @param year - Calendar year.
 * @param quarter - Quarter number between 1 and 4.
 */
export function formatQuarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

/**
 * Builds the display quarter tag (`QN YYYY`).
 *
 * @param year - Calendar year.
 * @param quarter - Quarter number between 1 and 4.
 */
export function formatQuarterTag(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

/**
 * Compares two canonical quarter keys chronologically.
 *
 * @param left - Left quarter key (`YYYY-QN`).
 * @param right - Right quarter key (`YYYY-QN`).
 * @returns Negative when `left` is earlier, positive when later, zero when equal.
 */
export function compareQuarterKeys(left: string, right: string): number {
  const leftParts = parseQuarterKey(left);
  const rightParts = parseQuarterKey(right);

  if (leftParts.year !== rightParts.year) {
    return leftParts.year - rightParts.year;
  }

  return leftParts.quarter - rightParts.quarter;
}

/**
 * Parses a canonical quarter key into numeric parts.
 *
 * @param quarterKey - Quarter key in `YYYY-QN` format.
 */
export function parseQuarterKey(quarterKey: string): QuarterParts {
  const match = QUARTER_KEY_REGEX.exec(quarterKey.trim());

  if (match === null) {
    throw new Error(`Invalid quarter key: ${quarterKey}`);
  }

  return {
    year: Number(match[1]),
    quarter: Number(match[2]) as QuarterParts['quarter'],
  };
}

/**
 * Resolves the current UTC quarter parts.
 */
export function resolveCurrentQuarterParts(): QuarterParts {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const quarter = (Math.floor(month / 3) + 1) as QuarterParts['quarter'];

  return { year, quarter };
}

/**
 * Builds quarter metadata for a specific year and quarter.
 *
 * @param parts - Parsed quarter parts.
 */
export function buildQuarterMetadata(parts: QuarterParts): QuarterMetadata {
  const { year, quarter } = parts;
  const periodStartMonth = (quarter - 1) * 3;
  const periodEndMonth = periodStartMonth + 2;
  const periodStart = formatFundPriceDate(
    new Date(Date.UTC(year, periodStartMonth, 1)),
  );
  const periodEnd = formatFundPriceDate(
    new Date(Date.UTC(year, periodEndMonth + 1, 0)),
  );

  return {
    year,
    quarter,
    quarterKey: formatQuarterKey(year, quarter),
    quarterTag: formatQuarterTag(year, quarter),
    periodStart,
    periodEnd,
  };
}

/**
 * Parses an optional `quarter` query parameter or defaults to the current UTC quarter.
 *
 * Accepted formats:
 * - `YYYY-QN` (canonical), e.g. `2026-Q2`
 * - `QN YYYY` (display), e.g. `Q2 2026`
 *
 * @param rawQuarter - Raw query value.
 */
export function resolveQuarterFromQuery(rawQuarter?: string): QuarterMetadata {
  if (rawQuarter === undefined || rawQuarter.trim().length === 0) {
    return buildQuarterMetadata(resolveCurrentQuarterParts());
  }

  const trimmed = rawQuarter.trim();
  const canonicalMatch = QUARTER_KEY_REGEX.exec(trimmed);

  if (canonicalMatch !== null) {
    return buildQuarterMetadata({
      year: Number(canonicalMatch[1]),
      quarter: Number(canonicalMatch[2]) as QuarterParts['quarter'],
    });
  }

  const displayMatch = /^Q([1-4])\s+(\d{4})$/i.exec(trimmed);

  if (displayMatch !== null) {
    return buildQuarterMetadata({
      quarter: Number(displayMatch[1]) as QuarterParts['quarter'],
      year: Number(displayMatch[2]),
    });
  }

  throw new Error(`Invalid quarter format: ${rawQuarter}`);
}
