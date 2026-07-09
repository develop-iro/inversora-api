import { IpThrottlerGuard } from './ip-throttler.guard';

describe('IpThrottlerGuard', () => {
  it('should track requests by x-forwarded-for when present', async () => {
    const guard = new IpThrottlerGuard({} as never, {} as never, {} as never);
    const tracker = await (
      guard as unknown as {
        getTracker: (request: Record<string, unknown>) => Promise<string>;
      }
    ).getTracker({
      header: (name: string) =>
        name === 'x-forwarded-for' ? '203.0.113.10, 10.0.0.1' : undefined,
      ip: '127.0.0.1',
    });

    expect(tracker).toBe('203.0.113.10');
  });

  it('should fall back to request ip when forwarded header is missing', async () => {
    const guard = new IpThrottlerGuard({} as never, {} as never, {} as never);
    const tracker = await (
      guard as unknown as {
        getTracker: (request: Record<string, unknown>) => Promise<string>;
      }
    ).getTracker({
      header: () => undefined,
      ip: '127.0.0.1',
    });

    expect(tracker).toBe('127.0.0.1');
  });
});
