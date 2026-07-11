import { Injectable, Logger } from '@nestjs/common';

import type { AnalyticsEvent } from '../entities/analytics-event.schema';
import { AnalyticsEventsRepository } from '../repositories/analytics-events.repository';

/**
 * Persists anonymous analytics events for MVP observability (HU-41).
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsEventsRepository: AnalyticsEventsRepository,
  ) {}

  /**
   * Records an anonymous analytics event without blocking the HTTP response.
   *
   * @param event - Validated analytics payload.
   */
  recordEvent(event: AnalyticsEvent): void {
    this.logger.log(
      JSON.stringify({
        type: 'analytics_event',
        ...event,
      }),
    );

    void this.analyticsEventsRepository
      .create(event)
      .catch((error: unknown) => {
        this.logger.warn(
          `Failed to persist analytics event "${event.event}": ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
  }
}
