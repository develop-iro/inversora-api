import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a single fund holding row. */
export class FundHoldingsItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: 'AAPL', nullable: true })
  asset!: string | null;

  @ApiProperty({ example: 'Apple Inc.' })
  name!: string;

  @ApiProperty({ example: 'US0378331005', nullable: true })
  isin!: string | null;

  @ApiProperty({ example: 7.12 })
  weightPercentage!: number;

  @ApiProperty({ type: Number, nullable: true, example: 36_500_000_000 })
  marketValue!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 190_000_000 })
  sharesNumber!: number | null;
}

/** Swagger schema for `GET /funds/:id/holdings` responses. */
export class FundHoldingsResponseDto {
  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ example: '2024-01-31', nullable: true })
  asOf!: string | null;

  @ApiProperty({ type: [FundHoldingsItemResponseDto] })
  holdings!: FundHoldingsItemResponseDto[];
}
