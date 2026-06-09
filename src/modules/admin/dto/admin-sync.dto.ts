import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Swagger schema for selectable manual sync pipeline steps. */
export class AdminSyncStepsRequestDto {
  @ApiPropertyOptional({
    description: 'Sync fund metadata from the provider.',
    default: true,
  })
  metadata?: boolean;

  @ApiPropertyOptional({
    description: 'Sync end-of-day price history.',
    default: true,
  })
  prices?: boolean;

  @ApiPropertyOptional({
    description: 'Sync holdings and sector/country exposure allocations.',
    default: true,
  })
  composition?: boolean;

  @ApiPropertyOptional({
    description: 'Recalculate and persist Inversora scores.',
    default: true,
  })
  scoring?: boolean;
}

/** Swagger schema for manual admin sync request bodies. */
export class AdminSyncRequestDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['SPY', 'QQQ'],
    description:
      'Optional symbol override. Defaults to SYNC_FUND_SYMBOLS or all persisted funds.',
  })
  symbols?: string[];

  @ApiPropertyOptional({ type: AdminSyncStepsRequestDto })
  steps?: AdminSyncStepsRequestDto;

  @ApiPropertyOptional({
    description:
      'When true, resumes price sync from the latest persisted date. Defaults to true.',
    default: true,
  })
  incrementalPrices?: boolean;

  @ApiPropertyOptional({
    description:
      'Inclusive lower bound for historical price requests (YYYY-MM-DD).',
    example: '2024-01-01',
  })
  historyFrom?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive upper bound for historical price requests (YYYY-MM-DD).',
    example: '2024-12-31',
  })
  historyTo?: string;
}

/** Swagger schema for per-symbol manual sync outcomes. */
export class AdminSyncItemResultDto {
  @ApiProperty({ example: 'SPY' })
  symbol!: string;

  @ApiProperty({ enum: ['success', 'failed'] })
  status!: 'success' | 'failed';

  @ApiPropertyOptional()
  fundCreated?: boolean;

  @ApiPropertyOptional()
  pricesSynced?: number;

  @ApiPropertyOptional()
  upToDate?: boolean;

  @ApiPropertyOptional()
  holdingsSynced?: number;

  @ApiPropertyOptional()
  allocationsSynced?: number;

  @ApiPropertyOptional({ example: '2024-01-31' })
  compositionAsOf?: string;

  @ApiPropertyOptional()
  error?: string;
}

/** Swagger schema for scoring outcomes in manual sync responses. */
export class AdminSyncScoringResultDto {
  @ApiProperty({ enum: ['success', 'failed', 'skipped'] })
  status!: 'success' | 'failed' | 'skipped';

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  updated?: number;

  @ApiPropertyOptional()
  error?: string;
}

/** Swagger schema for resolved manual sync pipeline steps. */
export class AdminSyncResolvedStepsDto {
  @ApiProperty()
  metadata!: boolean;

  @ApiProperty()
  prices!: boolean;

  @ApiProperty()
  composition!: boolean;

  @ApiProperty()
  scoring!: boolean;
}

/** Swagger schema for manual admin sync responses. */
export class AdminSyncResponseDto {
  @ApiProperty({ format: 'uuid' })
  runId!: string;

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({ format: 'date-time' })
  finishedAt!: string;

  @ApiProperty()
  durationMs!: number;

  @ApiProperty({ type: AdminSyncResolvedStepsDto })
  steps!: AdminSyncResolvedStepsDto;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  succeeded!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [AdminSyncItemResultDto] })
  results!: AdminSyncItemResultDto[];

  @ApiProperty({ type: AdminSyncScoringResultDto })
  scoring!: AdminSyncScoringResultDto;
}
