import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppConfigService } from '../../../shared/config/config.service';

/**
 * Protects read-only internal SORA tool endpoints.
 */
@Injectable()
export class AssistantInternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configuredKey = this.config.assistantInternalApiKey;

    if (configuredKey === undefined) {
      throw new UnauthorizedException(
        'SORA internal tools authentication is not configured',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = extractAssistantInternalApiKey(request);

    if (providedKey === undefined || providedKey !== configuredKey) {
      throw new UnauthorizedException('Invalid SORA internal API key');
    }

    return true;
  }
}

function extractAssistantInternalApiKey(request: Request): string | undefined {
  const headerKey = request.header('x-sora-internal-api-key');

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
