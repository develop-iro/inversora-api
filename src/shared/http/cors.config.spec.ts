import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  DEFAULT_DEV_CORS_ORIGINS,
  buildNestCorsOptions,
  resolveCorsOrigins,
} from './cors.config';

describe('buildNestCorsOptions', () => {
  it('should expose MVP browser methods and headers', () => {
    expect(buildNestCorsOptions(['http://localhost:8081'])).toEqual({
      origin: ['http://localhost:8081'],
      methods: [...CORS_ALLOWED_METHODS],
      allowedHeaders: [...CORS_ALLOWED_HEADERS],
      credentials: false,
      maxAge: 86_400,
    });
  });
});

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
