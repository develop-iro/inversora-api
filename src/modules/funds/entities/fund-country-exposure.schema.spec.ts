import { buildFundCountryExposureResponse } from './fund-country-exposure.mapper';
import { fundExposureQuerySchema } from './fund-country-exposure.schema';

describe('fundExposureQuerySchema', () => {
  it('should accept an optional snapshot date', () => {
    expect(fundExposureQuerySchema.parse({})).toEqual({});
    expect(fundExposureQuerySchema.parse({ asOf: '2024-01-31' })).toEqual({
      asOf: '2024-01-31',
    });
  });

  it('should reject invalid snapshot dates', () => {
    expect(() =>
      fundExposureQuerySchema.parse({ asOf: '31-01-2024' }),
    ).toThrow();
  });
});

describe('buildFundCountryExposureResponse', () => {
  it('should build a validated country exposure response payload', () => {
    expect(
      buildFundCountryExposureResponse(
        '550e8400-e29b-41d4-a716-446655440000',
        '2024-01-31',
        [
          {
            id: '550e8400-e29b-41d4-a716-446655440020',
            fundId: '550e8400-e29b-41d4-a716-446655440000',
            asOf: '2024-01-31',
            category: 'countries',
            label: 'Estados Unidos',
            weight: 62.4,
            sortOrder: 0,
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
            updatedAt: new Date('2024-02-01T00:00:00.000Z'),
          },
        ],
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      countries: [
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          label: 'Estados Unidos',
          weight: 62.4,
          sortOrder: 0,
        },
      ],
    });
  });
});
