import helmet from 'helmet';

import type { AppConfigService } from '../config/config.service';

/**
 * Builds Helmet middleware options for the HTTP server.
 *
 * @param config - Validated application configuration.
 */
export function buildHelmetMiddleware(
  config: AppConfigService,
): ReturnType<typeof helmet> {
  const enableHsts = config.appEnv !== 'local';

  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: enableHsts
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: false,
        }
      : false,
    referrerPolicy: { policy: 'no-referrer' },
  });
}
