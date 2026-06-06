import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a single sector exposure slice. */
export class FundSectorExposureItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Tecnología' })
  label!: string;

  @ApiProperty({ example: 31.5 })
  weight!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

/** Swagger schema for `GET /funds/:id/exposure/sectors` responses. */
export class FundSectorExposureResponseDto {
  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ example: '2024-01-31', nullable: true })
  asOf!: string | null;

  @ApiProperty({ type: [FundSectorExposureItemResponseDto] })
  sectors!: FundSectorExposureItemResponseDto[];
}
