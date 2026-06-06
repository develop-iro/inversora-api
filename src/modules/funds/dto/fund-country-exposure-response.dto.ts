import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a single country exposure slice. */
export class FundCountryExposureItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Estados Unidos' })
  label!: string;

  @ApiProperty({ example: 62.4 })
  weight!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

/** Swagger schema for `GET /funds/:id/exposure/countries` responses. */
export class FundCountryExposureResponseDto {
  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ example: '2024-01-31', nullable: true })
  asOf!: string | null;

  @ApiProperty({ type: [FundCountryExposureItemResponseDto] })
  countries!: FundCountryExposureItemResponseDto[];
}
