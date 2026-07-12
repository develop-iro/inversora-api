import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiAcceptedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { analyticsEventSchema } from '../entities/analytics-event.schema';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsThrottle } from '../../../shared/http/named-throttle.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @HttpCode(202)
  @AnalyticsThrottle()
  @ApiOperation({ summary: 'Record an anonymous analytics event' })
  @ApiAcceptedResponse({ description: 'Event accepted for processing.' })
  recordEvent(@Body() body: unknown): { accepted: true } {
    const event = analyticsEventSchema.parse(body);
    this.analyticsService.recordEvent(event);
    return { accepted: true };
  }
}
