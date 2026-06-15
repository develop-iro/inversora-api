import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppConfigService } from '../../../shared/config/config.service';

/**
 * Protects admin endpoints with a shared API key and feature flag.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  /**
   * Validates that manual admin sync is enabled and the caller presents a valid key.
   *
   * @param context - Nest execution context for the incoming request.
   * @returns Whether the request may proceed.
   */
  canActivate(context: ExecutionContext): boolean {
    if (!this.config.adminApiEnabled) {
      throw new NotFoundException();
    }

    const configuredKey = this.config.adminApiKey;

    if (configuredKey === undefined) {
      throw new UnauthorizedException(
        'Admin sync authentication is not configured',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = extractAdminApiKey(request);

    if (providedKey === undefined || providedKey !== configuredKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}

/**
 * Extracts the admin API key from supported request headers.
 *
 * @param request - Incoming HTTP request.
 * @returns Provided admin API key, if present.
 */
function extractAdminApiKey(request: Request): string | undefined {
  const headerKey = request.header('x-admin-api-key');

  if (headerKey !== undefined && headerKey.length > 0) {
    return headerKey;
  }

  const authorization = request.header('authorization');

  if (authorization === undefined) {
    return undefined;
  }

  const [scheme, token] = authorization.split(' ');

  if (
    scheme?.toLowerCase() === 'bearer' &&
    token !== undefined &&
    token.length > 0
  ) {
    return token;
  }

  return undefined;
}
