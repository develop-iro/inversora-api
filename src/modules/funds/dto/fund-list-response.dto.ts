import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for persisted fund metrics in list responses. */
export class FundMetricsResponseDto {
  @ApiProperty({ type: Number, nullable: true, example: 14.25 })
  volatility!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -8.5 })
  drawdown!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.0945 })
  ter!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 520_000_000_000 })
  aum!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 24.5 })
  per!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1.32 })
  dividendYield!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.05 })
  trackingError!: number | null;
}

/** Swagger schema for a fund item in list responses. */
export class FundListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'SPY' })
  symbol!: string;

  @ApiProperty({ example: 'US78462F1030', nullable: true })
  isin!: string | null;

  @ApiProperty({ example: 'State Street SPDR S&P 500 ETF Trust' })
  name!: string;

  @ApiProperty({ example: 'financial-modeling-prep' })
  provider!: string;

  @ApiProperty({ example: 'index' })
  category!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'S&P 500', nullable: true })
  benchmark!: string | null;

  @ApiProperty({ type: FundMetricsResponseDto })
  metrics!: FundMetricsResponseDto;

  @ApiProperty({ type: Number, nullable: true, example: 4 })
  riskLevel!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 82.5 })
  score!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Swagger schema for fund list pagination metadata. */
export class FundListMetaResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

/** Swagger schema for `GET /funds` responses. */
export class FundListResponseDto {
  @ApiProperty({ type: [FundListItemResponseDto] })
  data!: FundListItemResponseDto[];

  @ApiProperty({ type: FundListMetaResponseDto })
  meta!: FundListMetaResponseDto;
}
