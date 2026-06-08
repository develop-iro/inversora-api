import { ApiProperty } from '@nestjs/swagger';

/** Swagger schema for a single score factor breakdown. */
export class ScoreFactorBreakdownDto {
  @ApiProperty({ example: 34 })
  points!: number;

  @ApiProperty({ example: 40 })
  maxPoints!: number;

  @ApiProperty({ example: 'Rentabilidad ajustada al riesgo' })
  label!: string;

  @ApiProperty({ required: false, example: false })
  incomplete?: boolean;
}

/** Swagger schema for the Invesora Score response. */
export class InvesoraScoreResponseDto {
  @ApiProperty({ example: 87, minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ example: 'mvp-1' })
  version!: string;

  @ApiProperty({
    example: {
      riskAdjustedReturn: {
        points: 34,
        maxPoints: 40,
        label: 'Rentabilidad ajustada al riesgo',
      },
      risk: { points: 16, maxPoints: 20, label: 'Riesgo' },
      cost: { points: 13, maxPoints: 15, label: 'Comisión anual' },
      diversification: {
        points: 9,
        maxPoints: 10,
        label: 'Diversificación',
      },
      fundSize: { points: 10, maxPoints: 10, label: 'Tamaño del fondo' },
      age: { points: 5, maxPoints: 5, label: 'Antigüedad' },
    },
  })
  breakdown!: {
    riskAdjustedReturn: ScoreFactorBreakdownDto;
    risk: ScoreFactorBreakdownDto;
    cost: ScoreFactorBreakdownDto;
    diversification: ScoreFactorBreakdownDto;
    fundSize: ScoreFactorBreakdownDto;
    age: ScoreFactorBreakdownDto;
  };

  @ApiProperty({
    example:
      'Este fondo destaca por su buena rentabilidad ajustada al riesgo, bajo coste y tamaño sólido.',
  })
  summary!: string;

  @ApiProperty({
    type: [String],
    example: ['La rentabilidad pasada no garantiza resultados futuros.'],
  })
  warnings!: string[];
}
