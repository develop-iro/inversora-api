import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limits requests by the IP resolved by Express.
 *
 * Express only honors forwarded headers when `trust proxy` is configured by
 * bootstrap, which avoids letting callers spoof tracker keys directly.
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
    return Promise.resolve(httpRequest.ip ?? 'unknown');
  }
}
