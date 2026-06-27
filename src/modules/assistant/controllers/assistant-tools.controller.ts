import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodError } from 'zod';

import {
  AssistantToolCompareRequestDto,
  AssistantToolCompareResponseDto,
  AssistantToolFundSnapshotDto,
} from '../dto/assistant-tools.dto';
import {
  parseAssistantToolCompareRequest,
  parseAssistantToolIsin,
} from '../entities/assistant-tools.schema';
import { AssistantInternalApiKeyGuard } from '../guards/assistant-internal-api-key.guard';
import { AssistantToolsService } from '../services/assistant-tools.service';

@ApiTags('assistant-internal-tools')
@ApiSecurity('sora-internal-api-key')
@Controller('internal/assistant/tools')
@UseGuards(AssistantInternalApiKeyGuard)
export class AssistantToolsController {
  constructor(private readonly toolsService: AssistantToolsService) {}

  @Get('funds/:isin/snapshot')
  @ApiOperation({
    summary: 'Read a fund snapshot for SORA tools',
    description:
      'Internal read-only endpoint for the Python SORA agent. Requires ASSISTANT_INTERNAL_API_KEY.',
  })
  @ApiOkResponse({ type: AssistantToolFundSnapshotDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid internal key.' })
  @ApiNotFoundResponse({ description: 'Fund not found or not visible.' })
  @ApiBadRequestResponse({ description: 'Invalid ISIN.' })
  async getFundSnapshot(
    @Param('isin') isinParam: string,
  ): Promise<AssistantToolFundSnapshotDto> {
    try {
      const isin = parseAssistantToolIsin(isinParam);
      return await this.toolsService.getFundSnapshot(isin);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException(formatZodError(error));
      }

      throw error;
    }
  }

  @Post('funds/compare')
  @ApiOperation({
    summary: 'Read fund snapshots for SORA comparisons',
    description:
      'Internal read-only endpoint for educational product comparisons by the Python SORA agent.',
  })
  @ApiOkResponse({ type: AssistantToolCompareResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid internal key.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  async compareFunds(
    @Body() body: AssistantToolCompareRequestDto,
  ): Promise<AssistantToolCompareResponseDto> {
    try {
      const request = parseAssistantToolCompareRequest(body);
      return await this.toolsService.compareFunds(request.isins);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException(formatZodError(error));
      }

      throw error;
    }
  }
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
}
