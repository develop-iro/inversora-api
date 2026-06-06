import { buildFundSectorExposureResponse } from './fund-sector-exposure.mapper';

describe('buildFundSectorExposureResponse', () => {
  it('should build a validated sector exposure response payload', () => {
    expect(
      buildFundSectorExposureResponse(
        '550e8400-e29b-41d4-a716-446655440000',
        '2024-01-31',
        [
          {
            id: '550e8400-e29b-41d4-a716-446655440030',
            fundId: '550e8400-e29b-41d4-a716-446655440000',
            asOf: '2024-01-31',
            category: 'sectorial',
            label: 'Tecnología',
            weight: 31.5,
            sortOrder: 0,
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
            updatedAt: new Date('2024-02-01T00:00:00.000Z'),
          },
        ],
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      sectors: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          label: 'Tecnología',
          weight: 31.5,
          sortOrder: 0,
        },
      ],
    });
  });
});
