import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limits requests by client IP, honoring reverse-proxy forwarded headers.
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  /**
   * Resolves the rate-limit tracker key for the incoming request.
   *
   * @param request - Incoming HTTP request.
   */
  protected getTracker(request: Record<string, unknown>): Promise<string> {
    const httpRequest = request as unknown as Request;
    const forwardedFor = httpRequest.header('x-forwarded-for');
    const forwardedIp = forwardedFor?.split(',')[0]?.trim();

    if (forwardedIp !== undefined && forwardedIp.length > 0) {
      return Promise.resolve(forwardedIp);
    }

    return Promise.resolve(httpRequest.ip ?? 'unknown');
  }
}
