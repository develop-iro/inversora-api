import { Injectable, Logger } from '@nestjs/common';

import type { ProductFeedback } from '../entities/product-feedback.schema';
import { ProductFeedbackRepository } from '../repositories/product-feedback.repository';

/**
 * Persists anonymous product feedback for MVP validation.
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly productFeedbackRepository: ProductFeedbackRepository,
  ) {}

  /**
   * Records anonymous product feedback without blocking the HTTP response.
   *
   * @param feedback - Validated feedback payload.
   */
  recordFeedback(feedback: ProductFeedback): void {
    this.logger.log(
      JSON.stringify({
        type: 'product_feedback',
        clarity: feedback.clarity,
        wouldReturn: feedback.wouldReturn,
        surface: feedback.surface,
        hasMessage: Boolean(feedback.message && feedback.message.length > 0),
      }),
    );

    void this.productFeedbackRepository
      .create(feedback)
      .catch((error: unknown) => {
        this.logger.warn(
          `Failed to persist product feedback: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
  }
}
