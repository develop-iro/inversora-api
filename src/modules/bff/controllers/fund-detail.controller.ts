import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Fund } from '../../funds/entities/fund.schema';
import { FundsService } from '../../funds/services/funds.service';
import { FundDetailResponseDto } from '../dto/fund-detail-response.dto';
import { FundLiveMarketSnapshotResponseDto } from '../dto/fund-live-market-snapshot.dto';
import { isFundIsinIdentifier } from '../entities/fund-isin.utils';
import type { FundDetailResponse } from '../entities/fund-detail.schema';
import { GetFundLiveMarketSnapshotUseCase } from '../get-fund-live-market-snapshot';
import { FundDetailService } from '../services/fund-detail.service';

@ApiTags('bff')
@Controller('funds')
export class FundDetailController {
  constructor(
    private readonly fundDetailService: FundDetailService,
    private readonly fundsService: FundsService,
    private readonly getFundLiveMarketSnapshotUseCase: GetFundLiveMarketSnapshotUseCase,
  ) {}

  @Get(':identifier/market-snapshot')
  @ApiOperation({
    summary: 'Get live or latest EOD market snapshot for a fund',
    description:
      'Fetches a recent quote from FMP when available, otherwise falls back to the latest persisted end-of-day price. Intended for fund detail screens; not cached with catalog or ranking payloads.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'Fund ISIN (ISO 6166)',
    example: 'US78462F1030',
  })
  @ApiOkResponse({
    description: 'Live or latest EOD market snapshot.',
    type: FundLiveMarketSnapshotResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid ISIN format.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  getFundMarketSnapshot(@Param('identifier') identifier: string) {
    if (!isFundIsinIdentifier(identifier)) {
      throw new BadRequestException({
        message: 'Market snapshot is only available for ISIN routes',
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    return this.getFundLiveMarketSnapshotUseCase.execute(identifier);
  }

  @Get(':identifier')
  @ApiOperation({
    summary: 'Get aggregated fund detail by ISIN or legacy fund detail by UUID',
    description:
      'Returns the mobile `FundDetail` payload when the route parameter is an ISIN. Returns the core fund entity when the parameter is a UUID.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'Fund ISIN (ISO 6166) or fund UUID',
    examples: {
      isin: { value: 'US78462F1030' },
      uuid: { value: '550e8400-e29b-41d4-a716-446655440000' },
    },
  })
  @ApiOkResponse({
    description: 'Aggregated fund detail for ISIN routes.',
    type: FundDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid ISIN format.' })
  @ApiNotFoundResponse({ description: 'Fund not found.' })
  @ApiServiceUnavailableResponse({
    description: 'Aggregation failed for one or more detail sections.',
  })
  getFundByIdentifier(
    @Param('identifier') identifier: string,
  ): Promise<FundDetailResponse | Fund> {
    if (isFundIsinIdentifier(identifier)) {
      return this.fundDetailService.getFundDetailByIsin(identifier);
    }

    return this.fundsService.getFundById(identifier);
  }
}
