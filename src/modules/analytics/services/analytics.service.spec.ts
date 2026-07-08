import { Logger } from '@nestjs/common';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new AnalyticsService();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should log structured analytics events', () => {
    service.recordEvent({
      event: 'fund_opened',
      surface: 'fund-detail',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
    });

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'analytics_event',
        event: 'fund_opened',
        surface: 'fund-detail',
        timestamp: '2026-07-08T10:00:00.000Z',
        sessionId: 'session-abc',
      }),
    );
  });
});
