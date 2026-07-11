import { AnalyticsEventsRepository } from './analytics-events.repository';
import { PrismaService } from '../../../shared/database/prisma.service';

describe('AnalyticsEventsRepository', () => {
  let repository: AnalyticsEventsRepository;
  let prisma: {
    analyticsEvent: {
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      analyticsEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      },
    };

    repository = new AnalyticsEventsRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('should persist analytics events with parsed timestamps', async () => {
    await repository.create({
      event: 'learn_step_viewed',
      surface: 'learn_questionnaire',
      timestamp: '2026-07-11T10:00:00.000Z',
      sessionId: 'sess_test_123',
      appEnv: 'qa',
      appVersion: '1.0.0',
      properties: { stepId: 'welcome', stepIndex: 0 },
    });

    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        event: 'learn_step_viewed',
        surface: 'learn_questionnaire',
        sessionId: 'sess_test_123',
        occurredAt: new Date('2026-07-11T10:00:00.000Z'),
        properties: { stepId: 'welcome', stepIndex: 0 },
        appEnv: 'qa',
        appVersion: '1.0.0',
      },
    });
  });
});
