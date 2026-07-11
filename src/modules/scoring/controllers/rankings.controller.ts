import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RankingsResponseDto } from '../dto/rankings-response.dto';
import type { RankingsResponse } from '../entities/ranking.schema';
import { RankingsService } from '../services/rankings.service';

@ApiTags('rankings')
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get benchmark-scoped fund rankings',
    description:
      'Returns funds ranked by Inversora Score inside comparable benchmark groups (RN-02). Funds without a valid benchmark, score, ISIN, or TER are excluded from public rankings.',
  })
  @ApiOkResponse({
    description: 'Benchmark-scoped rankings ordered by score descending.',
    type: RankingsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiQuery({
    name: 'benchmark',
    required: false,
    type: String,
    description:
      'Filter to a single benchmark group. Matching is case-insensitive.',
    example: 'S&P 500',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      'Maximum number of ranked funds returned per benchmark group (default 10, max 100).',
    example: 10,
  })
  @ApiQuery({
    name: 'groupsLimit',
    required: false,
    type: Number,
    description:
      'Maximum benchmark groups when no `benchmark` filter is set (default 24, max 100). Prioritizes groups with more eligible funds.',
    example: 24,
  })
  getRankings(
    @Query() query: Record<string, unknown>,
  ): Promise<RankingsResponse> {
    return this.rankingsService.getRankings(query);
  }
}
