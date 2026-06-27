import { ApiProperty } from '@nestjs/swagger';

export class AssistantToolFundSnapshotDto {
  @ApiProperty({ example: 'US78462F1030' })
  isin!: string;

  @ApiProperty({ example: 'SPY' })
  symbol!: string;

  @ApiProperty({ example: 'SPDR S&P 500 ETF Trust' })
  name!: string;

  @ApiProperty({ example: 'etf' })
  vehicle!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'S&P 500', nullable: true })
  benchmark!: string | null;

  @ApiProperty({ example: 4, nullable: true })
  riskLevel!: number | null;

  @ApiProperty({
    example: {
      ter: 0.09,
      volatility: null,
      drawdown: null,
      aum: null,
      per: null,
      dividendYield: null,
      trackingError: null,
    },
  })
  metrics!: Record<string, number | null>;

  @ApiProperty({
    example: {
      value: 88,
      summary: 'Buen equilibrio entre coste y tamano.',
      warnings: [],
      version: 'rn-04',
    },
  })
  score!: Record<string, unknown>;
}

export class AssistantToolCompareRequestDto {
  @ApiProperty({
    description: 'ISINs selected for educational comparison.',
    example: ['US78462F1030', 'US46090E1038'],
    maxItems: 5,
  })
  isins!: string[];
}

export class AssistantToolCompareResponseDto {
  @ApiProperty({ type: [AssistantToolFundSnapshotDto] })
  funds!: AssistantToolFundSnapshotDto[];
}
