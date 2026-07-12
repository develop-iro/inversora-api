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
    summary: 'Get investment news for the home feed',
    description:
      'Returns market headlines sourced from Financial Modeling Prep. Falls back to curated educational headlines when the provider is unavailable.',
  })
  @ApiOkResponse({
    description: 'Investment news items for the home dashboard.',
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
  ): Promise<InvestmentNewsResponse> {
    return this.investmentNewsService.getInvestmentNews(query);
  }
}
