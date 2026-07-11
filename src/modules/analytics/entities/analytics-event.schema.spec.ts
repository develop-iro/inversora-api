import { analyticsEventSchema } from './analytics-event.schema';

describe('analyticsEventSchema', () => {
  it('should accept a valid anonymous analytics payload', () => {
    const parsed = analyticsEventSchema.parse({
      event: 'screen_view',
      surface: 'home',
      timestamp: '2026-07-08T10:00:00.000Z',
      sessionId: 'session-abc',
      properties: { isin: 'IE00B4L5Y983' },
    });

    expect(parsed.event).toBe('screen_view');
    expect(parsed.properties).toEqual({ isin: 'IE00B4L5Y983' });
  });

  it('should accept learn funnel events', () => {
    const parsed = analyticsEventSchema.parse({
      event: 'learn_step_viewed',
      surface: 'learn_questionnaire',
      timestamp: '2026-07-11T10:00:00.000Z',
      sessionId: 'session-abc',
      appEnv: 'qa',
      appVersion: '1.0.0',
      properties: { stepId: 'welcome', stepIndex: 0, mode: 'initial' },
    });

    expect(parsed.event).toBe('learn_step_viewed');
    expect(parsed.appEnv).toBe('qa');
  });

  it('should reject payloads with unknown event names', () => {
    expect(() =>
      analyticsEventSchema.parse({
        event: 'unknown_event',
        surface: 'home',
        timestamp: '2026-07-08T10:00:00.000Z',
        sessionId: 'session-abc',
      }),
    ).toThrow();
  });
});
