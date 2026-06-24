import {
  buildBenefitSummary,
  buildCategoryLabel,
  buildProductDescription,
  buildVehicleLabel,
} from './fund-vehicle.utils';

describe('fund-vehicle.utils', () => {
  it('should build vehicle-aware Spanish labels', () => {
    expect(buildVehicleLabel('etf')).toBe('ETF');
    expect(buildVehicleLabel('mutual-fund')).toBe('Fondo indexado');

    expect(buildCategoryLabel({ vehicle: 'etf', benchmark: 'S&P 500' })).toBe(
      'ETF · S&P 500',
    );
    expect(
      buildCategoryLabel({ vehicle: 'mutual-fund', benchmark: 'MSCI World' }),
    ).toBe('Fondo indexado · MSCI World');

    expect(
      buildProductDescription({ vehicle: 'etf', benchmark: 'S&P 500' }),
    ).toBe('ETF que replica S&P 500.');
    expect(
      buildProductDescription({
        vehicle: 'mutual-fund',
        benchmark: 'MSCI World',
      }),
    ).toBe('Fondo indexado que replica MSCI World.');

    expect(buildBenefitSummary({ vehicle: 'etf', benchmark: 'S&P 500' })).toBe(
      'ETF con referencia S&P 500.',
    );
    expect(
      buildBenefitSummary({ vehicle: 'mutual-fund', benchmark: null }),
    ).toBe('Fondo indexado');
  });
});
