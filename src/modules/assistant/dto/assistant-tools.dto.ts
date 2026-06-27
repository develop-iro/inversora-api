import { ApiProperty } from '@nestjs/swagger';

export class AssistantToolScoreBreakdownDto {
  @ApiProperty({ example: 'US78462F1030' })
  isin!: string;

  @ApiProperty({ example: 'SPDR S&P 500 ETF Trust' })
  name!: string;

  @ApiProperty({ example: 88, nullable: true })
  score!: number | null;

  @ApiProperty({ example: 'rn-04', required: false })
  version?: string;

  @ApiProperty({
    required: false,
    example: {
      ter: { points: 36, maxPoints: 40, label: 'TER' },
      tracking: { points: 34, maxPoints: 40, label: 'Tracking error' },
      aum: { points: 8, maxPoints: 10, label: 'AUM' },
      age: { points: 10, maxPoints: 10, label: 'Antiguedad' },
    },
  })
  breakdown?: Record<string, unknown>;

  @ApiProperty({ required: false })
  summary?: string;

  @ApiProperty({ required: false, type: [String] })
  warnings?: string[];
}

export class AssistantToolGlossaryTermDto {
  @ApiProperty({ example: 'TER' })
  term!: string;

  @ApiProperty({ example: 'Comision anual total del fondo.' })
  explanation!: string;
}

export class AssistantToolComparisonFairnessDto {
  @ApiProperty({ example: false })
  isFair!: boolean;

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty({
    example: [
      {
        isin: 'US78462F1030',
        benchmark: 'S&P 500',
        currency: 'USD',
        vehicle: 'etf',
      },
    ],
  })
  funds!: Array<{
    isin: string;
    benchmark: string | null;
    currency: string;
    vehicle: string;
  }>;
}

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
