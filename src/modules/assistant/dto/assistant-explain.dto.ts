import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Swagger schema for assistant explain request fund context. */
export class AssistantExplainFundDto {
  @ApiProperty({
    description: 'Fund ISIN for contextual explanations.',
    example: 'IE00B4L5Y983',
  })
  isin!: string;
}

/** Swagger schema for assistant explain request body. */
export class AssistantExplainRequestDto {
  @ApiProperty({
    enum: ['home', 'fund-detail', 'catalog', 'ranking', 'compare'],
    example: 'home',
  })
  surface!: string;

  @ApiProperty({
    description: 'User question (max 500 characters).',
    example: '¿Qué es el TER?',
  })
  message!: string;

  @ApiPropertyOptional({ type: AssistantExplainFundDto })
  fund?: AssistantExplainFundDto;

  @ApiPropertyOptional({ enum: ['es'], default: 'es' })
  locale?: string;
}

/** Swagger schema for assistant explain response. */
export class AssistantExplainResponseDto {
  @ApiProperty({
    example: 'Total Expense Ratio: comisión total anual del fondo.',
  })
  text!: string;

  @ApiPropertyOptional({ example: 'TER' })
  title?: string;

  @ApiProperty({ enum: ['glossary', 'cache', 'openai'], example: 'glossary' })
  source!: string;

  @ApiProperty({ example: false })
  cached!: boolean;

  @ApiProperty({
    example:
      'Inversora no oferece asesoramiento financiero personalizado. Esta respuesta es orientativa y educativa.',
  })
  disclaimer!: string;

  @ApiPropertyOptional({ example: 'IE00B4L5Y983' })
  relatedFundIsin?: string;

  @ApiProperty({ example: 'sora-v1' })
  promptVersion!: string;
}
