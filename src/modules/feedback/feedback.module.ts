import { Module } from '@nestjs/common';

import { FeedbackController } from './controllers/feedback.controller';
import { ProductFeedbackRepository } from './repositories/product-feedback.repository';
import { FeedbackService } from './services/feedback.service';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, ProductFeedbackRepository],
})
export class FeedbackModule {}
