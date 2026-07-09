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
