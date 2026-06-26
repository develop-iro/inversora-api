import { dedupeSymbols, isNonUsListedSymbol } from './fund-listing.utils';

describe('fund-listing.utils', () => {
  it('should detect non-US listed symbols', () => {
    expect(isNonUsListedSymbol('IWDA.L')).toBe(true);
    expect(isNonUsListedSymbol('VWCE.DE')).toBe(true);
    expect(isNonUsListedSymbol('SPY')).toBe(false);
  });

  it('should dedupe symbols preserving order', () => {
    expect(dedupeSymbols(['spy', 'VOO', 'SPY', '', 'voo'])).toEqual([
      'SPY',
      'VOO',
    ]);
  });
});
