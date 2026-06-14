import { ApiProperty } from '@nestjs/swagger';
import { FeaturedFundDto } from './fund-detail-response.dto';

/** Swagger schema for `GET /featured` responses. */
export class FeaturedFundsResponseDto {
  @ApiProperty({
    example: '2026-Q2',
    description:
      'Normalized quarter key echoed from the query or current UTC quarter.',
  })
  quarter!: string;

  @ApiProperty({
    example: 'Q2 2026',
    description: 'Display quarter tag for UI labels.',
  })
  quarterTag!: string;

  @ApiProperty({ example: '2026-04-01' })
  periodStart!: string;

  @ApiProperty({ example: '2026-06-30' })
  periodEnd!: string;

  @ApiProperty({
    type: [FeaturedFundDto],
    description:
      'Featured funds for the quarter. Empty when no curated selection exists or no synced funds match.',
  })
  data!: FeaturedFundDto[];
}
