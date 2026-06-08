import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { InvesoraScoreResponseDto } from '../dto/invesora-score-response.dto';
import type { InvesoraScore } from '../entities/invesora-score.schema';
import { ScoringService } from '../services/scoring.service';

@ApiTags('funds')
@Controller('funds')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get(':id/score')
  @ApiOperation({ summary: 'Get Invesora Score for a fund' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Invesora Score with factor breakdown.',
    type: InvesoraScoreResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid fund id.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  async getFundScore(@Param('id') id: string): Promise<InvesoraScore> {
    const score = await this.scoringService.calculateScoreForFundId(id);

    if (score === null) {
      throw new NotFoundException(`Fund ${id} was not found`);
    }

    return score;
  }
}
