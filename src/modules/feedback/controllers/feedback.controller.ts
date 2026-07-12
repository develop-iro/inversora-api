import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiAcceptedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { productFeedbackSchema } from '../entities/product-feedback.schema';
import { FeedbackService } from '../services/feedback.service';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: 'Record anonymous product feedback' })
  @ApiAcceptedResponse({ description: 'Feedback accepted for processing.' })
  recordFeedback(@Body() body: unknown): { accepted: true } {
    const feedback = productFeedbackSchema.parse(body);
    this.feedbackService.recordFeedback(feedback);
    return { accepted: true };
  }
}
