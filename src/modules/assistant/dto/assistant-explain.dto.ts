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

/** Swagger schema for assistant chat request body. */
export class AssistantChatRequestDto extends AssistantExplainRequestDto {
  @ApiPropertyOptional({
    description:
      'Client-provided conversation identifier. The backend echoes it in the response.',
    example: 'user-123:compare-sp500',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description:
      'Funds selected in the app for comparison or product analysis.',
    type: [AssistantExplainFundDto],
    maxItems: 5,
  })
  funds?: AssistantExplainFundDto[];
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
      'Inversora no ofrece asesoramiento financiero personalizado. Esta respuesta es orientativa y educativa.',
  })
  disclaimer!: string;

  @ApiPropertyOptional({ example: 'IE00B4L5Y983' })
  relatedFundIsin?: string;

  @ApiProperty({ example: 'sora-v1' })
  promptVersion!: string;
}

/** Swagger schema for assistant chat response. */
export class AssistantChatResponseDto extends AssistantExplainResponseDto {
  @ApiPropertyOptional({ example: 'user-123:compare-sp500' })
  sessionId?: string;
}
