import { Logger } from '@nestjs/common';

import { AppConfigService } from '../../../shared/config/config.service';
import { AnalyticsEventsRepository } from '../repositories/analytics-events.repository';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: { create: jest.Mock };
  let config: { isProductionDeployment: boolean };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    config = {
      isProductionDeployment: false,
    };
    service = new AnalyticsService(
      repository as unknown as AnalyticsEventsRepository,
      config as AppConfigService,
    );
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should log and persist structured analytics events', async () => {
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
    expect(repository.create).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should omit device and session identifiers from production logs', () => {
    config.isProductionDeployment = true;

    service.recordEvent({
      event: 'fund_opened',
      surface: 'fund-detail',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
      deviceId: 'device-abc',
      appEnv: 'pro',
      appVersion: '1.0.0',
    });

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'analytics_event',
        event: 'fund_opened',
        surface: 'fund-detail',
        appEnv: 'pro',
        appVersion: '1.0.0',
      }),
    );
  });

  it('should warn when persistence fails without throwing', async () => {
    repository.create.mockRejectedValue(new Error('database unavailable'));

    service.recordEvent({
      event: 'screen_view',
      surface: 'home',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
    });

    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist analytics event "screen_view": database unavailable',
    );
  });

  it('should stringify non-error persistence failures', async () => {
    repository.create.mockRejectedValue('offline');

    service.recordEvent({
      event: 'screen_view',
      surface: 'home',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
    });

    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist analytics event "screen_view": unknown error',
    );
  });
});
