import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FundListResponseDto } from '../dto/fund-list-response.dto';
import type { FundListResponse } from '../entities/fund-list.schema';
import { FundsService } from '../services/funds.service';

@ApiTags('funds')
@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get()
  @ApiOperation({ summary: 'List funds with pagination, sorting, and filters' })
  @ApiOkResponse({
    description: 'Paginated fund list.',
    type: FundListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'symbol',
      'name',
      'score',
      'ter',
      'aum',
      'riskLevel',
      'currency',
      'createdAt',
      'updatedAt',
    ],
    example: 'score',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search by symbol, name, ISIN, or benchmark.',
  })
  @ApiQuery({ name: 'category', required: false, enum: ['index'] })
  @ApiQuery({ name: 'currency', required: false, type: String, example: 'USD' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: ['financial-modeling-prep'],
  })
  @ApiQuery({ name: 'benchmark', required: false, type: String })
  @ApiQuery({ name: 'riskLevel', required: false, type: Number, example: 4 })
  @ApiQuery({ name: 'minScore', required: false, type: Number, example: 70 })
  @ApiQuery({ name: 'maxScore', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'minTer', required: false, type: Number, example: 0.05 })
  @ApiQuery({ name: 'maxTer', required: false, type: Number, example: 0.5 })
  listFunds(@Query() query: Record<string, unknown>): Promise<FundListResponse> {
    return this.fundsService.listFunds(query);
  }
}
