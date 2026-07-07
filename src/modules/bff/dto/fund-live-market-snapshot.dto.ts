import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for `GET /funds/:isin/market-snapshot`. */
export class FundLiveMarketSnapshotResponseDto {
  @ApiProperty({ example: 'US78462F1030' })
  isin!: string;

  @ApiProperty({ example: 'SPY' })
  symbol!: string;

  @ApiProperty({ type: Number, nullable: true, example: 545.23 })
  price!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.395 })
  changePercent!: number | null;

  @ApiProperty({ example: '2026-06-29T15:30:00.000Z' })
  asOf!: string;

  @ApiProperty({ enum: ['live', 'eod', 'unavailable'], example: 'live' })
  freshness!: 'live' | 'eod' | 'unavailable';

  @ApiProperty({ example: 'Financial Modeling Prep' })
  sourceLabel!: string;
}
