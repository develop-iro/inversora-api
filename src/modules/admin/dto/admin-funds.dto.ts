import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FundListItemResponseDto,
  FundListMetaResponseDto,
  FundListResponseDto,
} from '../../funds/dto/fund-list-response.dto';

/** Swagger schema for admin editorial update requests. */
export class AdminUpdateFundEditorialRequestDto {
  @ApiPropertyOptional({
    example: 'Ideal para empezar',
    description: 'Product badge shown on fund cards.',
  })
  badge?: string;

  @ApiPropertyOptional({
    example: 'Multisector global',
    description: 'Investment theme label for catalog cards.',
  })
  themeLabel?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the fund is editorially marked for beginners.',
  })
  idealForBeginners?: boolean;
}

/** Swagger schema for admin catalog visibility update requests. */
export class AdminUpdateCatalogVisibilityRequestDto {
  @ApiProperty({
    enum: ['visible', 'quarantined', 'blocked'],
    example: 'quarantined',
  })
  catalogVisibility!: 'visible' | 'quarantined' | 'blocked';

  @ApiProperty({
    example: 'Manual review: TER mismatch against provider factsheet',
  })
  reason!: string;

  @ApiPropertyOptional({ example: 'ops@inversora.dev' })
  actor?: string;
}

/** Swagger schema for catalog visibility audit rows. */
export class CatalogVisibilityAuditResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ enum: ['visible', 'quarantined', 'blocked'] })
  previousState!: 'visible' | 'quarantined' | 'blocked';

  @ApiProperty({ enum: ['visible', 'quarantined', 'blocked'] })
  newState!: 'visible' | 'quarantined' | 'blocked';

  @ApiProperty()
  reason!: string;

  @ApiProperty({ example: 'admin' })
  actor!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

/** Swagger schema for catalog visibility audit list responses. */
export class CatalogVisibilityAuditListResponseDto {
  @ApiProperty({ type: [CatalogVisibilityAuditResponseDto] })
  data!: CatalogVisibilityAuditResponseDto[];
}

/** Swagger schema for admin fund listings (includes non-visible funds). */
export class AdminFundListResponseDto extends FundListResponseDto {}

/** Re-export fund list DTOs used by admin listings. */
export { FundListItemResponseDto, FundListMetaResponseDto };
