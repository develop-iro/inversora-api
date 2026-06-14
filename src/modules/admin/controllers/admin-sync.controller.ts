import {
  BadRequestException,
  Body,
  Controller,
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
import { FundDailySyncService } from '../../funds/services/fund-daily-sync.service';
import type { ManualSyncResult } from '../../funds/services/fund-daily-sync.types';
import {
  AdminSyncRequestDto,
  AdminSyncResponseDto,
} from '../dto/admin-sync.dto';
import { AdminSyncEnabledGuard } from '../guards/admin-sync-enabled.guard';
import { AdminApiKeyGuard } from '../guards/admin-api-key.guard';
import {
  mapAdminSyncRequestToManualSyncOptions,
  parseAdminSyncRequest,
} from '../schemas/admin-sync-request.schema';

@ApiTags('admin')
@ApiSecurity('admin-api-key')
@Controller('admin')
@UseGuards(AdminApiKeyGuard, AdminSyncEnabledGuard)
export class AdminSyncController {
  constructor(private readonly fundDailySyncService: FundDailySyncService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Run the fund synchronization pipeline manually',
    description:
      'Triggers metadata, price, composition, and/or scoring sync for development and QA. ' +
      'Requires ADMIN_SYNC_ENABLED=true and a valid admin API key.',
  })
  @ApiOkResponse({
    description: 'Manual sync completed with per-symbol outcomes.',
    type: AdminSyncResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin API key.' })
  @ApiNotFoundResponse({ description: 'Admin sync is disabled.' })
  async runManualSync(
    @Body() body: AdminSyncRequestDto,
  ): Promise<ManualSyncResult> {
    try {
      const request = parseAdminSyncRequest(body);

      return this.fundDailySyncService.runManualSync(
        mapAdminSyncRequestToManualSyncOptions(request),
      );
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException(formatZodError(error));
      }

      throw error;
    }
  }
}

/**
 * Formats Zod validation issues into a concise HTTP error message.
 *
 * @param error - Zod validation error from request parsing.
 * @returns Human-readable validation summary.
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
}
