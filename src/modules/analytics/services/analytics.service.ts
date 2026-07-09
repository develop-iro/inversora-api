import { Injectable, Logger } from '@nestjs/common';
import type { AnalyticsEvent } from '../entities/analytics-event.schema';

/**
 * Persists anonymous analytics events for MVP observability (HU-41).
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  /**
   * Records an anonymous analytics event.
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
  }
}
