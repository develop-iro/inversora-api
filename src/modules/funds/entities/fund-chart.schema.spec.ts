import {
  buildFundChartResponse,
  mapFundPricesToChartPoints,
  resolveChartDateRange,
  subtractChartPeriodFromIsoDate,
} from './fund-chart.mapper';
import { fundChartQuerySchema } from './fund-chart.schema';

describe('fundChartQuerySchema', () => {
  it('should default the chart period to 1Y', () => {
    expect(fundChartQuerySchema.parse({})).toEqual({
      period: '1Y',
    });
  });

  it('should accept supported chart periods', () => {
    expect(fundChartQuerySchema.parse({ period: '3M' })).toEqual({
      period: '3M',
    });
  });
});

describe('subtractChartPeriodFromIsoDate', () => {
  it('should subtract lookback windows from an anchor date', () => {
    expect(subtractChartPeriodFromIsoDate('2024-03-31', '1M')).toBe(
      '2024-03-01',
    );
    expect(subtractChartPeriodFromIsoDate('2024-03-31', '1Y')).toBe(
      '2023-04-01',
    );
    expect(subtractChartPeriodFromIsoDate('2024-03-31', '5Y')).toBe(
      '2019-04-02',
    );
  });
});

describe('resolveChartDateRange', () => {
  it('should resolve an inclusive range from the latest persisted price date', () => {
    expect(resolveChartDateRange('1Y', '2024-01-31')).toEqual({
      from: '2023-01-31',
      to: '2024-01-31',
    });
  });

  it('should return a null end date when no prices exist yet', () => {
    expect(resolveChartDateRange('3M', null)).toMatchObject({
      to: null,
    });
  });
});

describe('mapFundPricesToChartPoints', () => {
  it('should index chart points from the first close in the window', () => {
    expect(
      mapFundPricesToChartPoints([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          fundId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2024-01-02',
          open: 472.16,
          high: 473.67,
          low: 470.49,
          close: 472.65,
          volume: null,
          change: null,
          changePercent: null,
          vwap: null,
          createdAt: new Date('2024-01-03T00:00:00.000Z'),
          updatedAt: new Date('2024-01-03T00:00:00.000Z'),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          fundId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
          volume: null,
          change: null,
          changePercent: null,
          vwap: null,
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
          updatedAt: new Date('2024-02-01T00:00:00.000Z'),
        },
      ]),
    ).toEqual([
      { date: '2024-01-02', close: 472.65, value: 100 },
      { date: '2024-01-31', close: 482.88, value: 102.1644 },
    ]);
  });

  it('should use a flat index when the first close is zero', () => {
    expect(
      mapFundPricesToChartPoints([
        {
          id: '1',
          fundId: 'fund-1',
          date: '2024-01-01',
          open: 0,
          high: 0,
          low: 0,
          close: 0,
          volume: null,
          change: null,
          changePercent: null,
          vwap: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    ).toEqual([{ date: '2024-01-01', close: 0, value: 100 }]);
  });
});

describe('buildFundChartResponse', () => {
  it('should build a validated chart response payload', () => {
    expect(
      buildFundChartResponse(
        '550e8400-e29b-41d4-a716-446655440000',
        '1Y',
        '2023-01-31',
        '2024-01-31',
        [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            fundId: '550e8400-e29b-41d4-a716-446655440000',
            date: '2024-01-31',
            open: 488.62,
            high: 489.08,
            low: 482.86,
            close: 482.88,
            volume: null,
            change: null,
            changePercent: null,
            vwap: null,
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
            updatedAt: new Date('2024-02-01T00:00:00.000Z'),
          },
        ],
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      period: '1Y',
      from: '2023-01-31',
      to: '2024-01-31',
      asOf: '2024-01-31',
      points: [{ date: '2024-01-31', close: 482.88, value: 100 }],
    });
  });
});
