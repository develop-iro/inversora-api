import { evaluateComparisonFairness } from './assistant-comparison.utils';

describe('evaluateComparisonFairness', () => {
  it('returns fair when a single fund is provided', () => {
    expect(
      evaluateComparisonFairness([
        {
          isin: 'US78462F1030',
          benchmark: 'S&P 500',
          currency: 'USD',
          vehicle: 'etf',
        },
      ]),
    ).toEqual({
      isFair: true,
      warnings: [],
      funds: [
        {
          isin: 'US78462F1030',
          benchmark: 'S&P 500',
          currency: 'USD',
          vehicle: 'etf',
        },
      ],
    });
  });

  it('flags mixed benchmarks, currencies and vehicles', () => {
    const result = evaluateComparisonFairness([
      {
        isin: 'US78462F1030',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'etf',
      },
      {
        isin: 'IE00B4L5Y983',
        benchmark: 'MSCI World',
        currency: 'EUR',
        vehicle: 'mutual-fund',
      },
    ]);

    expect(result.isFair).toBe(false);
    expect(result.warnings).toHaveLength(3);
  });

  it('returns fair when comparable funds share benchmark, currency and vehicle', () => {
    const result = evaluateComparisonFairness([
      {
        isin: 'US78462F1030',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'etf',
      },
      {
        isin: 'US46090E1038',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'etf',
      },
    ]);

    expect(result).toMatchObject({
      isFair: true,
      warnings: [],
    });
  });
});
