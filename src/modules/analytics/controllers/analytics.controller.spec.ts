import { Test, TestingModule } from '@nestjs/testing';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from '../services/analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let recordEvent: jest.Mock;

  beforeEach(async () => {
    recordEvent = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: { recordEvent },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should accept valid analytics events', () => {
    const response = controller.recordEvent({
      event: 'compare_completed',
      surface: 'compare',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
    });

    expect(response).toEqual({ accepted: true });
    expect(recordEvent).toHaveBeenCalledWith({
      event: 'compare_completed',
      surface: 'compare',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
    });
  });
});
