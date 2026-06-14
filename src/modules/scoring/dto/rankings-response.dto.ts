import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a ranked fund entry. */
export class RankedFundEntryResponseDto {
  @ApiProperty({ example: 1, minimum: 1 })
  rank!: number;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'IVV' })
  symbol!: string;

  @ApiProperty({ example: 'US4642872000' })
  isin!: string;

  @ApiProperty({ example: 'iShares Core S&P 500 ETF' })
  name!: string;

  @ApiProperty({ example: 92, minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ example: 'S&P 500' })
  benchmark!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ type: Number, nullable: true, example: 4 })
  riskLevel!: number | null;

  @ApiProperty({ example: 0.03 })
  ter!: number;
}

/** Swagger schema for a benchmark-scoped ranking group. */
export class BenchmarkRankingGroupResponseDto {
  @ApiProperty({
    example: 'S&P 500',
    description: 'Display label for the comparable benchmark group.',
  })
  benchmark!: string;

  @ApiProperty({
    example: 's&p 500',
    description: 'Normalized benchmark key used for peer grouping.',
  })
  benchmarkKey!: string;

  @ApiProperty({
    example: 12,
    description: 'Total eligible funds in the group before `limit` is applied.',
  })
  total!: number;

  @ApiProperty({ type: [RankedFundEntryResponseDto] })
  funds!: RankedFundEntryResponseDto[];
}

/** Swagger schema for `GET /rankings` responses. */
export class RankingsResponseDto {
  @ApiProperty({ type: [BenchmarkRankingGroupResponseDto] })
  data!: BenchmarkRankingGroupResponseDto[];
}
