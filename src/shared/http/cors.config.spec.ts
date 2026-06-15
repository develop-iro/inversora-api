import { DEFAULT_DEV_CORS_ORIGINS, resolveCorsOrigins } from './cors.config';

describe('resolveCorsOrigins', () => {
  it('should return configured origins when provided', () => {
    expect(
      resolveCorsOrigins(['https://app.example.com'], 'production'),
    ).toEqual(['https://app.example.com']);
  });

  it('should return Expo web defaults in development when unset', () => {
    expect(resolveCorsOrigins([], 'development')).toEqual(
      DEFAULT_DEV_CORS_ORIGINS,
    );
  });

  it('should disable CORS in production when unset', () => {
    expect(resolveCorsOrigins([], 'production')).toEqual([]);
  });
});
