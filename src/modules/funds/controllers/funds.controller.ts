import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FundListItemResponseDto, FundListResponseDto } from '../dto/fund-list-response.dto';
import { FundChartResponseDto } from '../dto/fund-chart-response.dto';
import { FundCountryExposureResponseDto } from '../dto/fund-country-exposure-response.dto';
import { FundHoldingsResponseDto } from '../dto/fund-holdings-response.dto';
import type { FundListResponse } from '../entities/fund-list.schema';
import type { FundChartResponse } from '../entities/fund-chart.schema';
import type { FundCountryExposureResponse } from '../entities/fund-country-exposure.schema';
import type { FundHoldingsResponse } from '../entities/fund-holdings.schema';
import type { Fund } from '../entities/fund.schema';
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

  @Get(':id/exposure/countries')
  @ApiOperation({ summary: 'Get fund geographic exposure by country' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'asOf',
    required: false,
    type: String,
    description: 'Snapshot date (YYYY-MM-DD). Latest snapshot is used when omitted.',
    example: '2024-01-31',
  })
  @ApiOkResponse({
    description: 'Country-level geographic exposure for the requested snapshot.',
    type: FundCountryExposureResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid fund id or query parameters.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  getFundCountryExposure(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ): Promise<FundCountryExposureResponse> {
    return this.fundsService.getFundCountryExposure(id, query);
  }

  @Get(':id/holdings')
  @ApiOperation({ summary: 'Get fund portfolio holdings' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'asOf',
    required: false,
    type: String,
    description: 'Snapshot date (YYYY-MM-DD). Latest snapshot is used when omitted.',
    example: '2024-01-31',
  })
  @ApiOkResponse({
    description: 'Ranked fund holdings for the requested snapshot.',
    type: FundHoldingsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid fund id or query parameters.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  getFundHoldings(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ): Promise<FundHoldingsResponse> {
    return this.fundsService.getFundHoldings(id, query);
  }

  @Get(':id/chart')
  @ApiOperation({ summary: 'Get fund historical chart data' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['1M', '3M', '1Y', '3Y', '5Y'],
    example: '1Y',
  })
  @ApiOkResponse({
    description: 'Indexed historical chart series.',
    type: FundChartResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid fund id or query parameters.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  getFundChart(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ): Promise<FundChartResponse> {
    return this.fundsService.getFundChart(id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fund detail by id' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Fund detail.',
    type: FundListItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid fund id.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  getFundById(@Param('id') id: string): Promise<Fund> {
    return this.fundsService.getFundById(id);
  }
}
