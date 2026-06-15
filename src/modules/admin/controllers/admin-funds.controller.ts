import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
} from '../../funds/entities/fund-list.mapper';
import { fundIdParamSchema } from '../../funds/entities/fund.schema';
import type { FundListResponse } from '../../funds/entities/fund-list.schema';
import { fundListResponseSchema } from '../../funds/entities/fund-list.schema';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import {
  AdminFundListResponseDto,
  AdminUpdateCatalogVisibilityRequestDto,
  CatalogVisibilityAuditListResponseDto,
} from '../dto/admin-funds.dto';
import { AdminApiKeyGuard } from '../guards/admin-api-key.guard';
import { AdminCatalogEnabledGuard } from '../guards/admin-catalog-enabled.guard';
import {
  adminFundListQuerySchema,
  catalogVisibilityAuditListResponseSchema,
  parseAdminUpdateCatalogVisibilityRequest,
  type AdminFundListQuery,
} from '../schemas/admin-funds.schema';

@ApiTags('admin')
@ApiSecurity('admin-api-key')
@Controller('admin/funds')
@UseGuards(AdminApiKeyGuard, AdminCatalogEnabledGuard)
export class AdminFundsController {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly catalogVisibilityService: CatalogVisibilityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List funds including quarantined and blocked records',
  })
  @ApiOkResponse({
    description: 'Paginated admin fund list.',
    type: AdminFundListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin API key.' })
  @ApiNotFoundResponse({ description: 'Admin API is disabled.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'catalogVisibility',
    required: false,
    enum: ['visible', 'quarantined', 'blocked'],
    isArray: true,
    description:
      'Filter by one or more catalog visibility states. Omit to include all states.',
  })
  listFunds(
    @Query() query: Record<string, unknown>,
  ): Promise<FundListResponse> {
    const parsedQuery = this.parseAdminListQuery(query);
    const where = buildFundListWhereInput(parsedQuery, {
      catalogVisibility: parsedQuery.catalogVisibility ?? [
        'visible',
        'quarantined',
        'blocked',
      ],
    });
    const orderBy = buildFundListOrderByInput(
      parsedQuery.sortBy,
      parsedQuery.sortOrder,
    );
    const skip = (parsedQuery.page - 1) * parsedQuery.limit;

    return this.fundsRepository
      .findMany({
        where,
        orderBy,
        skip,
        take: parsedQuery.limit,
      })
      .then(({ items, total }) =>
        fundListResponseSchema.parse({
          data: items,
          meta: buildFundListMeta(parsedQuery.page, parsedQuery.limit, total),
        }),
      );
  }

  @Patch(':id/catalog-visibility')
  @ApiOperation({ summary: 'Update catalog visibility for a fund' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Updated fund with the new catalog visibility state.',
    type: AdminFundListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body or fund id.' })
  @ApiNotFoundResponse({ description: 'Fund not found or admin API disabled.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin API key.' })
  updateCatalogVisibility(
    @Param('id') id: string,
    @Body() body: AdminUpdateCatalogVisibilityRequestDto,
  ) {
    const fundId = this.parseFundId(id);
    const request = parseAdminUpdateCatalogVisibilityRequest(body);

    return this.catalogVisibilityService.updateCatalogVisibility({
      fundId,
      catalogVisibility: request.catalogVisibility,
      reason: request.reason,
      actor: request.actor,
    });
  }

  @Get(':id/catalog-visibility/audit')
  @ApiOperation({ summary: 'List catalog visibility audit history for a fund' })
  @ApiParam({
    name: 'id',
    description: 'Fund UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Catalog visibility audit rows ordered by newest first.',
    type: CatalogVisibilityAuditListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid fund id.' })
  @ApiNotFoundResponse({ description: 'Fund not found or admin API disabled.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin API key.' })
  async listCatalogVisibilityAudit(@Param('id') id: string) {
    const fundId = this.parseFundId(id);
    const data =
      await this.catalogVisibilityService.listVisibilityAudits(fundId);

    return catalogVisibilityAuditListResponseSchema.parse({ data });
  }

  private parseAdminListQuery(
    rawQuery: Record<string, unknown>,
  ): AdminFundListQuery {
    const parsed = adminFundListQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid admin fund list query parameters',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data;
  }

  private parseFundId(id: string): string {
    const parsed = fundIdParamSchema.safeParse({ id });

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid fund id',
        issues: z.treeifyError(parsed.error),
      });
    }

    return parsed.data.id;
  }
}
