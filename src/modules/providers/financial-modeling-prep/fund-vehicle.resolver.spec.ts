import { resolveFundVehicleFromFmpMetadata } from './fund-vehicle.resolver';

describe('resolveFundVehicleFromFmpMetadata', () => {
  it('classifies mutual funds from the FMP exchange code', () => {
    expect(
      resolveFundVehicleFromFmpMetadata({
        name: 'Vanguard 500 Index Fund',
        exchange: 'MUTUAL_FUND',
      }),
    ).toBe('mutual-fund');
  });

  it('classifies ETFs from product names', () => {
    expect(
      resolveFundVehicleFromFmpMetadata({
        name: 'SPDR S&P 500 ETF Trust',
      }),
    ).toBe('etf');
  });

  it('defaults listed products without mutual-fund exchange to ETF', () => {
    expect(
      resolveFundVehicleFromFmpMetadata({
        name: 'Some Listed Product',
        exchange: 'NYSEARCA',
      }),
    ).toBe('etf');
  });

  it('defaults unknown metadata to mutual fund', () => {
    expect(
      resolveFundVehicleFromFmpMetadata({
        name: 'Some Index Product',
      }),
    ).toBe('mutual-fund');
  });
});
