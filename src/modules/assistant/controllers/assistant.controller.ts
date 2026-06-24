import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodError } from 'zod';

import {
  AssistantExplainRequestDto,
  AssistantExplainResponseDto,
} from '../dto/assistant-explain.dto';
import type { AssistantExplainResponse } from '../entities/assistant-context.schema';
import { parseAssistantExplainRequest } from '../entities/assistant-context.schema';
import { AssistantService } from '../services/assistant.service';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('explain')
  @ApiOperation({
    summary: 'Explain investment concepts or fund data (SORA)',
    description:
      'Educational assistant endpoint. Returns glossary, cached, or OpenAI-generated explanations. Does not modify rankings or provide buy/sell advice.',
  })
  @ApiOkResponse({
    description: 'Educational assistant response.',
    type: AssistantExplainResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or prohibited intent.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Assistant disabled or OpenAI unavailable.',
  })
  async explain(
    @Body() body: AssistantExplainRequestDto,
  ): Promise<AssistantExplainResponse> {
    try {
      const request = parseAssistantExplainRequest(body);
      return await this.assistantService.explain(request);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException(formatZodError(error));
      }

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('prohibited')) {
        throw new BadRequestException(
          'SORA no puede responder con lenguaje de recomendación directa.',
        );
      }

      throw error;
    }
  }
}

/**
 * Formats Zod validation issues into a concise HTTP error message.
 *
 * @param error - Zod validation error from request parsing.
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
}
