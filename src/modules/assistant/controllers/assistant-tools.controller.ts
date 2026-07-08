import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
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
  AssistantToolComparisonFairnessDto,
  AssistantToolFundSnapshotDto,
  AssistantToolGlossaryTermDto,
  AssistantToolScoreBreakdownDto,
} from '../dto/assistant-tools.dto';
import {
  parseAssistantToolCompareRequest,
  parseAssistantToolGlossaryTerm,
  parseAssistantToolIsin,
} from '../entities/assistant-tools.schema';
import { AssistantInternalApiKeyGuard } from '../guards/assistant-internal-api-key.guard';
import { AssistantToolsService } from '../services/assistant-tools.service';

@ApiTags('assistant-internal-tools')
@ApiSecurity('sora-internal-api-key')
@Controller('internal/assistant/tools')
@SkipThrottle()
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

  @Get('funds/:isin/score-breakdown')
  @ApiOperation({
    summary: 'Read score breakdown for SORA tools',
    description:
      'Internal read-only endpoint for educational score explanations.',
  })
  @ApiOkResponse({ type: AssistantToolScoreBreakdownDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid internal key.' })
  @ApiNotFoundResponse({ description: 'Fund not found or not visible.' })
  @ApiBadRequestResponse({ description: 'Invalid ISIN.' })
  async getScoreBreakdown(
    @Param('isin') isinParam: string,
  ): Promise<AssistantToolScoreBreakdownDto> {
    try {
      const isin = parseAssistantToolIsin(isinParam);
      return await this.toolsService.getScoreBreakdown(isin);
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

  @Post('funds/validate-comparison')
  @ApiOperation({
    summary: 'Validate whether a fund comparison is educationally fair',
    description:
      'Checks benchmark, currency and vehicle homogeneity before compare explanations.',
  })
  @ApiOkResponse({ type: AssistantToolComparisonFairnessDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid internal key.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  async validateComparisonFairness(
    @Body() body: AssistantToolCompareRequestDto,
  ): Promise<AssistantToolComparisonFairnessDto> {
    try {
      const request = parseAssistantToolCompareRequest(body);
      return await this.toolsService.validateComparisonFairness(request.isins);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException(formatZodError(error));
      }

      throw error;
    }
  }

  @Get('glossary/:term')
  @ApiOperation({
    summary: 'Read a glossary term for SORA tools',
    description:
      'Internal read-only glossary lookup for the Python SORA agent.',
  })
  @ApiOkResponse({ type: AssistantToolGlossaryTermDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid internal key.' })
  @ApiNotFoundResponse({ description: 'Glossary term not found.' })
  @ApiBadRequestResponse({ description: 'Invalid term.' })
  getGlossaryTerm(
    @Param('term') termParam: string,
  ): AssistantToolGlossaryTermDto {
    try {
      const term = parseAssistantToolGlossaryTerm(termParam);
      return this.toolsService.getGlossaryTerm(term);
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
