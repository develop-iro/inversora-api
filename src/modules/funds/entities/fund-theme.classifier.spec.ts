import { classifyFundInvestmentTheme } from './fund-theme.classifier';

describe('classifyFundInvestmentTheme', () => {
  it('should classify US broad market ETFs', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'State Street SPDR S&P 500 ETF',
        benchmark: 'S&P 500',
        assetClass: 'Equity',
      }),
    ).toMatchObject({ theme: 'us-equity', matchedRule: 'us-equity-benchmark' });
  });

  it('should classify technology ETFs by name even when benchmark is Nasdaq 100', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'Invesco QQQ Trust',
        benchmark: 'Nasdaq 100',
        assetClass: 'Equity',
      }),
    ).toMatchObject({
      theme: 'technology',
      matchedRule: 'technology-keywords',
    });
  });

  it('should classify ESG products before geographic themes', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'iShares ESG Aware MSCI USA ETF',
        benchmark: 'MSCI USA ESG',
        assetClass: 'Equity',
      }),
    ).toMatchObject({ theme: 'esg', matchedRule: 'esg-keywords' });
  });

  it('should classify global equity funds', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'iShares Core MSCI World UCITS ETF',
        benchmark: 'MSCI World',
        assetClass: 'Equity',
      }),
    ).toMatchObject({
      theme: 'global-equity',
      matchedRule: 'global-equity-benchmark',
    });
  });

  it('should classify fixed income by asset class', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'iShares Core U.S. Aggregate Bond ETF',
        benchmark: 'Bloomberg Aggregate',
        assetClass: 'Fixed Income',
      }),
    ).toMatchObject({
      theme: 'fixed-income',
      matchedRule: 'fixed-income-asset-class',
    });
  });

  it('should classify sector thematic products', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'VanEck Gold Miners ETF',
        benchmark: 'NYSE Arca Gold Miners Index',
        assetClass: 'Equity',
      }),
    ).toMatchObject({
      theme: 'sector-other',
      matchedRule: 'sector-other-keywords',
    });
  });

  it('should return unclassified when no rule matches', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'Example Custom Strategy ETF',
        benchmark: 'Proprietary Index',
        assetClass: 'Alternatives',
      }),
    ).toMatchObject({
      theme: 'unclassified',
      matchedRule: 'no-rule-match',
    });
  });

  it('should return unclassified when classifier input is empty', () => {
    expect(classifyFundInvestmentTheme({ name: '' })).toMatchObject({
      theme: 'unclassified',
      matchedRule: 'empty-corpus',
    });
  });

  it('should fall back to global equity for generic equity asset class', () => {
    expect(
      classifyFundInvestmentTheme({
        name: 'Generic Equity ETF',
        benchmark: 'Custom Index',
        assetClass: 'Equity',
      }),
    ).toMatchObject({
      theme: 'global-equity',
      matchedRule: 'equity-asset-class-fallback',
    });
  });
});
