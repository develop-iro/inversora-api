import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a single fund chart point. */
export class FundChartPointResponseDto {
  @ApiProperty({ example: '2024-01-31' })
  date!: string;

  @ApiProperty({ example: 482.88 })
  close!: number;

  @ApiProperty({
    example: 102.35,
    description:
      'Indexed level where 100 equals the first point in the window.',
  })
  value!: number;
}

/** Swagger schema for `GET /funds/:id/chart` responses. */
export class FundChartResponseDto {
  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ enum: ['1M', '3M', '1Y', '3Y', '5Y'], example: '1Y' })
  period!: string;

  @ApiProperty({ example: '2023-01-31' })
  from!: string;

  @ApiProperty({ example: '2024-01-31', nullable: true })
  to!: string | null;

  @ApiProperty({ example: '2024-01-31', nullable: true })
  asOf!: string | null;

  @ApiProperty({ type: [FundChartPointResponseDto] })
  points!: FundChartPointResponseDto[];
}
