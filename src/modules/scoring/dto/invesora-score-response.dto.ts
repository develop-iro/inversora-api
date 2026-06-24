import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a single score factor breakdown. */
export class ScoreFactorBreakdownDto {
  @ApiProperty({ example: 32 })
  points!: number;

  @ApiProperty({ example: 40 })
  maxPoints!: number;

  @ApiProperty({ example: 'Comisión (TER)' })
  label!: string;

  @ApiProperty({ required: false, example: false })
  incomplete?: boolean;
}

/** Swagger schema for the Invesora Score response. */
export class InvesoraScoreResponseDto {
  @ApiProperty({ example: 78, minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ example: 'rn-04' })
  version!: string;

  @ApiProperty({
    example: {
      ter: {
        points: 32,
        maxPoints: 40,
        label: 'Comisión (TER)',
      },
      tracking: {
        points: 30,
        maxPoints: 40,
        label: 'Tracking error',
      },
      aum: { points: 8, maxPoints: 10, label: 'Patrimonio (AUM)' },
      age: { points: 8, maxPoints: 10, label: 'Antigüedad del fondo' },
    },
  })
  breakdown!: {
    ter: ScoreFactorBreakdownDto;
    tracking: ScoreFactorBreakdownDto;
    aum: ScoreFactorBreakdownDto;
    age: ScoreFactorBreakdownDto;
  };

  @ApiProperty({
    example: 'Este fondo destaca por su comisión (ter) y tracking error.',
  })
  summary!: string;

  @ApiProperty({
    type: [String],
    example: ['La rentabilidad pasada no garantiza resultados futuros.'],
  })
  warnings!: string[];
}
