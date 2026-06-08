import { Injectable, Logger } from '@nestjs/common';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppConfigService } from '../../../shared/config/config.service';

/** Fixture registry keyed by FMP endpoint identifier. */
export const FMP_FIXTURE_FILES = {
  searchSymbol: 'search-symbol.query-spy.json',
  searchName: 'search-name.query-vanguard.json',
  etfInfo: 'etf-info.symbol-spy.json',
  historicalPriceEod:
    'historical-price-eod.symbol-spy.from-2024-01-01.to-2024-01-31.json',
  etfHoldings: 'etf-holdings.symbol-spy.json',
  etfSectorWeightings: 'etf-sector-weightings.symbol-spy.json',
  etfCountryWeightings: 'etf-country-weightings.symbol-spy.json',
} as const;

/**
 * Loads and optionally persists committed FMP fixture files.
 */
@Injectable()
export class FinancialModelingPrepFixtureService {
  private readonly logger = new Logger(
    FinancialModelingPrepFixtureService.name,
  );

  constructor(private readonly config: AppConfigService) {}

  /**
   * Reads a committed fixture file.
   *
   * @param fileName - Fixture file name under the fixtures directory.
   * @returns Parsed fixture payload.
   */
  async readFixture(fileName: string): Promise<unknown> {
    const filePath = join(__dirname, 'fixtures', fileName);
    const rawContent = await readFile(filePath, 'utf8');

    return JSON.parse(rawContent) as unknown;
  }

  /**
   * Persists a live FMP response as a fixture when saving is enabled.
   *
   * @param fileName - Fixture file name under the fixtures directory.
   * @param data - Raw FMP response payload.
   */
  async saveFixtureIfEnabled(fileName: string, data: unknown): Promise<void> {
    if (!this.config.fmpSaveFixtures) {
      return;
    }

    const filePath = join(__dirname, 'fixtures', fileName);
    const serialized = `${JSON.stringify(data, null, 2)}\n`;

    await writeFile(filePath, serialized, 'utf8');
    this.logger.log(`Saved FMP fixture ${fileName}`);
  }

  /**
   * Filters a fixture-backed search result list by query.
   *
   * @param data - Raw fixture payload.
   * @param query - User search query.
   * @returns Filtered raw search rows.
   */
  filterSearchFixture(data: unknown, query: string): unknown[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return data.filter((item) => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }

      const record = item as Record<string, unknown>;
      const symbol = this.toScalarString(record.symbol).toLowerCase();
      const name = this.toScalarString(record.name).toLowerCase();

      return symbol.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }

  /**
   * Filters fixture-backed historical prices by optional date range.
   *
   * @param data - Raw fixture payload.
   * @param from - Optional inclusive start date.
   * @param to - Optional inclusive end date.
   * @returns Filtered raw historical rows.
   */
  filterHistoricalFixture(
    data: unknown,
    from?: string,
    to?: string,
  ): unknown[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter((item) => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }

      const record = item as Record<string, unknown>;
      const date = this.toScalarString(record.date);

      if (from !== undefined && date < from) {
        return false;
      }

      if (to !== undefined && date > to) {
        return false;
      }

      return true;
    });
  }

  /**
   * Converts fixture scalar values to strings without relying on object coercion.
   *
   * @param value - Raw fixture field value.
   * @param fallback - Value used when the input is not a scalar.
   * @returns String representation safe for comparisons.
   */
  private toScalarString(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return fallback;
  }
}
