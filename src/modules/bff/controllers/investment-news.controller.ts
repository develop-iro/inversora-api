import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { InvestmentNewsResponse } from '../entities/investment-news.schema';
import { InvestmentNewsService } from '../services/investment-news.service';

@ApiTags('bff')
@Controller('news')
export class InvestmentNewsController {
  constructor(private readonly investmentNewsService: InvestmentNewsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get curated educational investment news',
    description:
      'Returns editorial headlines for the home news section. Content is curated for beginners and does not include live market feeds.',
  })
  @ApiOkResponse({
    description: 'Curated educational news items for the home dashboard.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters (e.g. out-of-range `limit`).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of news items to return (1–20).',
    example: 4,
  })
  getInvestmentNews(
    @Query() query: Record<string, unknown>,
  ): InvestmentNewsResponse {
    return this.investmentNewsService.getInvestmentNews(query);
  }
}
