import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Fixture registry keyed by MyInvestor MCP tool. */
export const MYINVESTOR_FIXTURE_FILES = {
  getFunds: 'get-funds.isins-sample.json',
  searchIndexFunds: 'search-funds.indexed-global.json',
} as const;

/**
 * Loads committed MyInvestor MCP fixture files for mock mode and tests.
 */
@Injectable()
export class MyInvestorFixtureService {
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
}
