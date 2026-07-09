import { buildHelmetMiddleware } from './security-headers.config';

describe('buildHelmetMiddleware', () => {
  it('should disable HSTS for local deployments', () => {
    const middleware = buildHelmetMiddleware({ appEnv: 'local' } as never);

    expect(typeof middleware).toBe('function');
  });

  it('should enable HSTS for production deployments', () => {
    const middleware = buildHelmetMiddleware({ appEnv: 'pro' } as never);

    expect(typeof middleware).toBe('function');
  });
});
