import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../shared/database/prisma.service';
import type { AnalyticsEvent } from '../entities/analytics-event.schema';

/**
 * Persists anonymous analytics events in PostgreSQL.
 */
@Injectable()
export class AnalyticsEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts a validated analytics event row.
   *
   * @param event - Validated analytics payload from the mobile client.
   */
  async create(event: AnalyticsEvent): Promise<void> {
    const properties = event.properties as Prisma.InputJsonValue | undefined;
    const occurredAt = new Date(event.timestamp);

    await this.prisma.analyticsEvent.create({
      data: {
        event: event.event,
        surface: event.surface,
        sessionId: event.sessionId,
        deviceId: event.deviceId,
        occurredAt,
        properties,
        appEnv: event.appEnv,
        appVersion: event.appVersion,
      },
    });
  }
}
