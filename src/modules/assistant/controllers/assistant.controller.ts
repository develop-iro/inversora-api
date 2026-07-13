import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ZodError } from 'zod';

import {
  AssistantChatRequestDto,
  AssistantChatResponseDto,
  AssistantExplainRequestDto,
  AssistantExplainResponseDto,
} from '../dto/assistant-explain.dto';
import type {
  AssistantChatResponse,
  AssistantExplainResponse,
} from '../entities/assistant-context.schema';
import {
  parseAssistantChatRequest,
  parseAssistantExplainRequest,
} from '../entities/assistant-context.schema';
import { AssistantThrottle } from '../decorators/assistant-throttle.decorator';
import { AssistantService } from '../services/assistant.service';
import { AnonymousDevicesService } from '../../anonymous-devices/services/anonymous-devices.service';

@ApiTags('assistant')
@Controller('assistant')
@SkipThrottle({ default: true })
@AssistantThrottle()
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly anonymousDevicesService: AnonymousDevicesService,
  ) {}

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
  @ApiTooManyRequestsResponse({
    description: 'Temporary SORA usage limit reached.',
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

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with SORA about educational investing questions',
    description:
      'Conversational assistant endpoint for app bot flows. Supports selected funds for educational product analysis and comparison. Does not provide buy/sell advice.',
  })
  @ApiOkResponse({
    description: 'Conversational educational assistant response.',
    type: AssistantChatResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or prohibited intent.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Assistant disabled or runtime unavailable.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Temporary SORA usage limit reached.',
  })
  async chat(
    @Body() body: AssistantChatRequestDto,
    @Headers('x-device-token') deviceToken?: string,
  ): Promise<AssistantChatResponse> {
    try {
      const request = parseAssistantChatRequest(body);
      const deviceId =
        await this.anonymousDevicesService.resolveOptionalDeviceId(deviceToken);
      return await this.assistantService.chat(request, deviceId);
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
          'SORA no puede responder con lenguaje de recomendacion directa.',
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
