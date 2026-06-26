import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppConfigService } from '../../../shared/config/config.service';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

/**
 * Lightweight in-memory rate limiter for public SORA endpoints.
 */
@Injectable()
export class AssistantRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.buildKey(request);
    const now = Date.now();
    const windowMs = this.config.assistantRateLimitWindowSeconds * 1_000;
    const maxRequests = this.config.assistantRateLimitMaxRequests;
    const bucket = this.buckets.get(key);

    if (bucket === undefined || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      this.pruneExpiredBuckets(now);
      return true;
    }

    if (bucket.count >= maxRequests) {
      throw new HttpException(
        'Has alcanzado el limite temporal de uso de SORA. Intentalo de nuevo en unos segundos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private buildKey(request: Request): string {
    const clientId = request.header('x-sora-client-id');

    if (clientId !== undefined && clientId.trim().length > 0) {
      return `client:${clientId.trim()}`;
    }

    const forwardedFor = request.header('x-forwarded-for');
    const forwardedIp = forwardedFor?.split(',')[0]?.trim();

    return `ip:${forwardedIp ?? request.ip ?? 'unknown'}`;
  }

  private pruneExpiredBuckets(now: number): void {
    if (this.buckets.size < 1_000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
