import {
  catalogVisibilitySchema,
  isCatalogVisible,
} from './catalog-visibility.schema';

const completeFund = {
  catalogVisibility: 'visible' as const,
  isin: 'US78462F1030',
  benchmark: 'S&P 500',
  name: 'State Street SPDR S&P 500 ETF Trust',
  metrics: { ter: 0.0945 },
};

describe('catalogVisibilitySchema', () => {
  it('should validate supported catalog visibility states', () => {
    expect(catalogVisibilitySchema.parse('visible')).toBe('visible');
    expect(catalogVisibilitySchema.parse('quarantined')).toBe('quarantined');
    expect(catalogVisibilitySchema.parse('blocked')).toBe('blocked');
  });
});

describe('isCatalogVisible', () => {
  it('should allow visible funds in the public catalog', () => {
    expect(isCatalogVisible(completeFund)).toBe(true);
  });

  it('should hide blocked funds', () => {
    expect(
      isCatalogVisible({
        ...completeFund,
        catalogVisibility: 'blocked',
      }),
    ).toBe(false);
  });

  it('should expose quarantined funds when catalog metadata is complete', () => {
    expect(
      isCatalogVisible({
        ...completeFund,
        catalogVisibility: 'quarantined',
      }),
    ).toBe(true);
  });

  it('should hide quarantined funds with incomplete catalog metadata', () => {
    expect(
      isCatalogVisible({
        catalogVisibility: 'quarantined',
        isin: null,
        benchmark: 'S&P 500',
        name: 'Incomplete fund',
        metrics: { ter: 0.1 },
      }),
    ).toBe(false);
  });

  it('should hide quarantined funds with blank ISIN, benchmark, name, or TER', () => {
    expect(
      isCatalogVisible({
        ...completeFund,
        catalogVisibility: 'quarantined',
        isin: '   ',
      }),
    ).toBe(false);
    expect(
      isCatalogVisible({
        ...completeFund,
        catalogVisibility: 'quarantined',
        benchmark: ' ',
      }),
    ).toBe(false);
    expect(
      isCatalogVisible({
        ...completeFund,
        catalogVisibility: 'quarantined',
        name: '   ',
      }),
    ).toBe(false);
    expect(
      isCatalogVisible({
        ...completeFund,
        catalogVisibility: 'quarantined',
        metrics: { ter: null },
      }),
    ).toBe(false);
  });
});
