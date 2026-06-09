import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for score criterion rows. */
export class ScoreCriterionResultDto {
  @ApiProperty({
    enum: ['ter', 'tracking', 'aum', 'age', 'consistency', 'dataQuality'],
  })
  id!: string;

  @ApiProperty({ example: 'Comisión (TER)' })
  label!: string;

  @ApiProperty({ example: 28 })
  points!: number;

  @ApiProperty({ example: 30 })
  maxPoints!: number;
}

/** Swagger schema for featured fund card data. */
export class FeaturedFundDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'US78462F1030' })
  isin!: string;

  @ApiProperty({ example: 'S&P 500 Acc' })
  name!: string;

  @ApiProperty({ example: 'Índice S&P 500' })
  categoryLabel!: string;

  @ApiProperty({ example: '' })
  themeLabel!: string;

  @ApiProperty({ example: '' })
  badge!: string;

  @ApiProperty({ example: true })
  idealForBeginners!: boolean;

  @ApiProperty({ example: 84 })
  efficiencyScore!: number;

  @ApiProperty({ example: 0.07 })
  terPercent!: number;

  @ApiProperty({ enum: ['low', 'medium', 'high'], example: 'medium' })
  riskLevel!: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'], example: 'high' })
  diversification!: string;

  @ApiProperty({ example: 'Q2 2026' })
  quarterTag!: string;

  @ApiProperty({ example: '2026-04-01' })
  periodStart!: string;

  @ApiProperty({ example: '2026-06-30' })
  periodEnd!: string;

  @ApiProperty({ example: 'Fondo indexado con referencia S&P 500.' })
  benefitSummary!: string;

  @ApiProperty({ example: '' })
  featuredReason!: string;

  @ApiProperty({ example: false })
  isFeatured!: boolean;
}

/** Swagger schema for performance chart points. */
export class FundPerformancePointDto {
  @ApiProperty({ example: '2026-01-02' })
  date!: string;

  @ApiProperty({ example: 100 })
  value!: number;
}

/** Swagger schema for a performance series. */
export class FundPerformanceSeriesDto {
  @ApiProperty({ enum: ['ytd', '1y', '3y', '5y', 'max'], example: '1y' })
  timeframe!: string;

  @ApiProperty({ type: [FundPerformancePointDto] })
  points!: FundPerformancePointDto[];

  @ApiProperty({ example: '2026-06-09T00:00:00.000Z' })
  asOf!: string;

  @ApiProperty({ example: 'Financial Modeling Prep' })
  sourceLabel!: string;
}

/** Swagger schema for regional slices. */
export class FundRegionSliceDto {
  @ApiProperty({ example: 'Estados Unidos' })
  label!: string;

  @ApiProperty({ example: 99.1 })
  percent!: number;
}

/** Swagger schema for the market snapshot block. */
export class FundMarketSnapshotDto {
  @ApiProperty({
    example: {
      ytd: {
        timeframe: 'ytd',
        points: [],
        asOf: '2026-06-09T00:00:00.000Z',
        sourceLabel: 'Financial Modeling Prep',
      },
      '1y': {
        timeframe: '1y',
        points: [],
        asOf: '2026-06-09T00:00:00.000Z',
        sourceLabel: 'Financial Modeling Prep',
      },
      '3y': {
        timeframe: '3y',
        points: [],
        asOf: '2026-06-09T00:00:00.000Z',
        sourceLabel: 'Financial Modeling Prep',
      },
      '5y': {
        timeframe: '5y',
        points: [],
        asOf: '2026-06-09T00:00:00.000Z',
        sourceLabel: 'Financial Modeling Prep',
      },
      max: {
        timeframe: 'max',
        points: [],
        asOf: '2026-06-09T00:00:00.000Z',
        sourceLabel: 'Financial Modeling Prep',
      },
    },
  })
  performanceByTimeframe!: Record<string, FundPerformanceSeriesDto>;

  @ApiProperty({ type: [FundRegionSliceDto] })
  regions!: FundRegionSliceDto[];

  @ApiProperty({ example: 'Volatilidad media' })
  stabilityLabel!: string;

  @ApiProperty({ required: false, example: -0.3 })
  stabilityChangePercent?: number;
}

/** Swagger schema for allocation slices. */
export class AllocationSliceDto {
  @ApiProperty({ example: 'Tecnología' })
  label!: string;

  @ApiProperty({ example: 31.2 })
  percent!: number;

  @ApiProperty({ required: false, example: 'laptop' })
  icon?: string;
}

/** Swagger schema for the profile block. */
export class FundDetailProfileDto {
  @ApiProperty({ example: '2026-06-09T00:00:00.000Z' })
  asOf!: string;

  @ApiProperty({ example: 'Financial Modeling Prep' })
  sourceLabel!: string;

  @ApiProperty({
    example: 'Replica el índice S&P 500 con acumulación de dividendos.',
  })
  description!: string;

  @ApiProperty({ example: '—' })
  manager!: string;

  @ApiProperty({ example: 'S&P 500' })
  benchmark!: string;

  @ApiProperty({ example: true })
  isIndexed!: boolean;

  @ApiProperty({ example: '12.400 BUSD' })
  fundAum!: string;

  @ApiProperty({ required: false, example: '8.100 BUSD' })
  classAum?: string;

  @ApiProperty({ example: '01/01/2012' })
  inceptionDate!: string;

  @ApiProperty({ example: [] })
  summaryRows!: Array<{ id: string; label: string; value: string }>;

  @ApiProperty({ example: [{ id: 'ter', label: 'TER', value: '0,07 %' }] })
  feeRows!: Array<{ id: string; label: string; value: string }>;

  @ApiProperty({
    example: [{ id: 'kiid', label: 'KIID', status: 'coming_soon' }],
  })
  documents!: Array<{
    id: string;
    label: string;
    status: 'available' | 'coming_soon';
    url?: string;
  }>;

  @ApiProperty({
    example: [{ id: '1y', label: '1 año', percent: 12.5 }],
  })
  returnsByPeriod!: Array<{
    id: string;
    label: string;
    percent: number | null;
  }>;

  @ApiProperty({ example: [{ year: 2025, percent: 11.2 }] })
  returnsByYear!: Array<{ year: number; percent: number | null }>;

  @ApiProperty({ example: '* Calculada en USD' })
  currencyNote!: string;

  @ApiProperty({ example: 'Rentabilidades netas de comisiones del fondo.' })
  methodNote!: string;

  @ApiProperty({ example: { '12m': [], '3y': [], '5y': [] } })
  ratiosByHorizon!: Record<
    string,
    Array<{ id: string; label: string; value: string }>
  >;

  @ApiProperty({
    example: {
      sectorial: [],
      regional: [],
      assetAllocation: [],
      capitalization: [],
      portfolio: [],
    },
  })
  exposureByTab!: Record<string, AllocationSliceDto[]>;

  @ApiProperty({ example: [] })
  distributors!: Array<{
    id: string;
    name: string;
    kind: 'bank' | 'broker';
    note?: string;
  }>;
}

/** Swagger schema for `GET /funds/:isin`. */
export class FundDetailResponseDto {
  @ApiProperty({ type: FeaturedFundDto })
  fund!: FeaturedFundDto;

  @ApiProperty({ example: 84 })
  inversoraScore!: number;

  @ApiProperty({ required: false, example: 2 })
  rank?: number;

  @ApiProperty({ type: [ScoreCriterionResultDto] })
  scoredBreakdown!: ScoreCriterionResultDto[];

  @ApiProperty({ enum: ['ok', 'warning', 'quarantined'], example: 'ok' })
  scoringStatus!: string;

  @ApiProperty({ type: FundMarketSnapshotDto })
  market!: FundMarketSnapshotDto;

  @ApiProperty({ type: FundDetailProfileDto })
  profile!: FundDetailProfileDto;
}
