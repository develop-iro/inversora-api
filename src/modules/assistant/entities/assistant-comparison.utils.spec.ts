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

  it('flags only benchmark mismatch', () => {
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
        currency: 'USD',
        vehicle: 'etf',
      },
    ]);

    expect(result.isFair).toBe(false);
    expect(result.warnings).toEqual([
      'Los fondos tienen benchmarks distintos; la comparacion tecnica puede no ser homogenea.',
    ]);
  });

  it('flags only currency mismatch', () => {
    const result = evaluateComparisonFairness([
      {
        isin: 'US78462F1030',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'etf',
      },
      {
        isin: 'IE00B4L5Y983',
        benchmark: 'S&P 500',
        currency: 'EUR',
        vehicle: 'etf',
      },
    ]);

    expect(result.warnings).toEqual([
      'Los fondos usan divisas distintas; conviene comparar costes y metricas con cautela.',
    ]);
  });

  it('flags only vehicle mismatch', () => {
    const result = evaluateComparisonFairness([
      {
        isin: 'US78462F1030',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'etf',
      },
      {
        isin: 'IE00B4L5Y983',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'mutual-fund',
      },
    ]);

    expect(result.warnings).toEqual([
      'Los vehiculos de inversion difieren (por ejemplo ETF vs fondo); la comparacion puede no ser directa.',
    ]);
  });

  it('ignores missing benchmarks when evaluating fairness', () => {
    const result = evaluateComparisonFairness([
      {
        isin: 'US78462F1030',
        benchmark: null,
        currency: 'USD',
        vehicle: 'etf',
      },
      {
        isin: 'US46090E1038',
        benchmark: null,
        currency: 'USD',
        vehicle: 'etf',
      },
    ]);

    expect(result.isFair).toBe(true);
    expect(result.warnings).toEqual([]);
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
