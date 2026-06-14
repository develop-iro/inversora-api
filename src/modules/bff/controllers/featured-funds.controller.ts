import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FeaturedFundsResponseDto } from '../dto/featured-funds-response.dto';
import type { FeaturedFundsResponse } from '../entities/featured-funds.schema';
import { FeaturedFundsService } from '../services/featured-funds.service';

@ApiTags('bff')
@Controller('featured')
export class FeaturedFundsController {
  constructor(private readonly featuredFundsService: FeaturedFundsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get quarterly featured funds',
    description:
      'Returns manually curated featured funds for a quarter, hydrated with live catalog metrics (score, TER, risk). When no selection exists for the requested quarter, returns HTTP 200 with an empty `data` array.',
  })
  @ApiOkResponse({
    description:
      'Quarterly featured funds for the home dashboard carousel and widgets.',
    type: FeaturedFundsResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid query parameters (e.g. malformed `quarter`, out-of-range `limit`).',
  })
  @ApiQuery({
    name: 'quarter',
    required: false,
    type: String,
    description:
      'Target quarter. Canonical format: `YYYY-QN` (e.g. `2026-Q2`). Also accepts display format `QN YYYY` (e.g. `Q2 2026`). Defaults to the current UTC quarter.',
    example: '2026-Q2',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of featured funds to return (1–20).',
    example: 4,
  })
  @ApiQuery({
    name: 'benchmark',
    required: false,
    type: String,
    description:
      'Optional case-insensitive filter against the fund category label / benchmark text.',
    example: 'S&P 500',
  })
  @ApiQuery({
    name: 'mercado',
    required: false,
    type: String,
    description:
      'Optional market filter (`global`, `usa`, `europa`, or free-text match against labels).',
    example: 'usa',
  })
  getFeaturedFunds(
    @Query() query: Record<string, unknown>,
  ): Promise<FeaturedFundsResponse> {
    return this.featuredFundsService.getFeaturedFunds(query);
  }
}
