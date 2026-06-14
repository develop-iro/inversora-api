import {
  FeaturedQuarterParseError,
  parseFeaturedQuarterQuery,
} from './featured-funds.mapper';
import { parseQuarterKey } from './quarter-metadata.utils';

describe('quarter-metadata.utils errors', () => {
  it('should reject invalid quarter keys', () => {
    expect(() => parseQuarterKey('2026-Q5')).toThrow('Invalid quarter key');
  });
});

describe('featured-funds.mapper errors', () => {
  it('should wrap invalid quarter query values', () => {
    expect(() => parseFeaturedQuarterQuery('bad')).toThrow(
      FeaturedQuarterParseError,
    );
  });
});
