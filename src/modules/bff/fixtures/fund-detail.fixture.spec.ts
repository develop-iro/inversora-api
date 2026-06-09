import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fundDetailResponseSchema } from '../entities/fund-detail.schema';

const fixturesDir = join(__dirname);

/**
 * Loads a JSON fixture and validates it against the fund detail schema.
 *
 * @param filename - Fixture filename relative to the fixtures directory.
 */
function parseFixture(filename: string): void {
  const raw = readFileSync(join(fixturesDir, filename), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  fundDetailResponseSchema.parse(parsed);
}

describe('fund-detail fixtures', () => {
  it('should validate the minimal fixture against the BFF contract', () => {
    expect(() =>
      parseFixture('fund-detail-minimal.fixture.json'),
    ).not.toThrow();
  });

  it('should validate the typical fixture against the BFF contract', () => {
    expect(() =>
      parseFixture('fund-detail-typical.fixture.json'),
    ).not.toThrow();
  });
});
