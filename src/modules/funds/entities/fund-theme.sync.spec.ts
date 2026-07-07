import { resolveFundThemeSyncFields } from './fund-theme.sync';

describe('resolveFundThemeSyncFields', () => {
  it('should auto-fill themeLabel when editorial copy is empty', () => {
    expect(
      resolveFundThemeSyncFields(
        {
          name: 'State Street SPDR S&P 500 ETF',
          benchmark: 'S&P 500',
          assetClass: 'Equity',
        },
        '',
      ),
    ).toMatchObject({
      investmentTheme: 'us-equity',
      themeLabel: 'Renta variable USA',
    });
  });

  it('should preserve curated themeLabel while refreshing investmentTheme', () => {
    expect(
      resolveFundThemeSyncFields(
        {
          name: 'State Street SPDR S&P 500 ETF',
          benchmark: 'S&P 500',
          assetClass: 'Equity',
        },
        'Referencia S&P 500',
      ),
    ).toMatchObject({
      investmentTheme: 'us-equity',
      themeLabel: 'Referencia S&P 500',
    });
  });
});
