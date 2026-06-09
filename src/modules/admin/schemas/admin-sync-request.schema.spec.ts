import {
  mapAdminSyncRequestToManualSyncOptions,
  parseAdminSyncRequest,
} from './admin-sync-request.schema';

describe('adminSyncRequestSchema', () => {
  it('should parse an empty body', () => {
    expect(parseAdminSyncRequest({})).toEqual({});
  });

  it('should parse symbols and step overrides', () => {
    expect(
      parseAdminSyncRequest({
        symbols: [' spy ', 'qqq'],
        steps: {
          composition: false,
        },
        incrementalPrices: false,
        historyFrom: '2024-01-01',
        historyTo: '2024-01-31',
      }),
    ).toEqual({
      symbols: ['spy', 'qqq'],
      steps: {
        composition: false,
      },
      incrementalPrices: false,
      historyFrom: '2024-01-01',
      historyTo: '2024-01-31',
    });
  });

  it('should reject invalid historical date bounds', () => {
    expect(() =>
      parseAdminSyncRequest({
        historyFrom: '2024/01/01',
      }),
    ).toThrow();
  });

  it('should map request options to manual sync service options', () => {
    expect(
      mapAdminSyncRequestToManualSyncOptions({
        symbols: ['SPY'],
        steps: { scoring: true },
      }),
    ).toEqual({
      symbols: ['SPY'],
      steps: { scoring: true },
      incrementalPrices: undefined,
      historyFrom: undefined,
      historyTo: undefined,
    });
  });
});
