import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';
import type { ProductFeedback } from '../entities/product-feedback.schema';

/**
 * Persists anonymous product feedback in PostgreSQL.
 */
@Injectable()
export class ProductFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts a validated feedback row.
   *
   * @param feedback - Validated feedback payload from the mobile client.
   */
  async create(feedback: ProductFeedback): Promise<void> {
    const message = feedback.message?.trim();
    const normalizedMessage =
      message && message.length > 0 ? message : undefined;

    await this.prisma.productFeedback.create({
      data: {
        clarity: feedback.clarity,
        wouldReturn: feedback.wouldReturn,
        message: normalizedMessage,
        surface: feedback.surface,
        deviceId: feedback.deviceId,
        appEnv: feedback.appEnv,
        appVersion: feedback.appVersion,
      },
    });
  }
}
