import * as Sentry from '@sentry/nestjs';

const sentryDsn = process.env.SENTRY_DSN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.APP_ENV === 'pro' ? 0.2 : 1,
  });
}
