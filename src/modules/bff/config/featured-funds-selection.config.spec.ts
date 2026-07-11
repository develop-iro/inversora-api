import {
  findLatestFeaturedSelection,
  listFeaturedSelectionsNewestFirst,
  resolveFeaturedSelectionForQuarter,
} from './featured-funds-selection.config';

describe('featured-funds-selection.config', () => {
  it('should resolve a direct quarter selection', () => {
    const selection = resolveFeaturedSelectionForQuarter('2026-Q2');

    expect(selection?.quarterKey).toBe('2026-Q2');
  });

  it('should fall back to the latest configured quarter when allowed', () => {
    const selection = resolveFeaturedSelectionForQuarter('2028-Q1', {
      allowLatestFallback: true,
    });

    expect(selection?.quarterKey).toBe('2026-Q3');
  });

  it('should not fall back when the quarter is explicitly requested', () => {
    const selection = resolveFeaturedSelectionForQuarter('2028-Q1', {
      allowLatestFallback: false,
    });

    expect(selection).toBeUndefined();
  });

  it('should return the latest configured quarter', () => {
    expect(findLatestFeaturedSelection()?.quarterKey).toBe('2026-Q3');
  });

  it('should list configured selections from newest to oldest quarter', () => {
    const selections = listFeaturedSelectionsNewestFirst();

    expect(selections.map((selection) => selection.quarterKey)).toEqual([
      '2026-Q3',
      '2026-Q2',
      '2026-Q1',
    ]);
  });
});
