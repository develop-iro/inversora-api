import { z } from 'zod';
import {
  catalogVisibilitySchema,
  type CatalogVisibility,
} from '../../funds/entities/catalog-visibility.schema';
import {
  fundListQuerySchema,
  fundListResponseSchema,
} from '../../funds/entities/fund-list.schema';

/** Query schema for admin fund listings with optional visibility filters. */
export const adminFundListQuerySchema = fundListQuerySchema.extend({
  catalogVisibility: z
    .union([catalogVisibilitySchema, z.array(catalogVisibilitySchema)])
    .optional()
    .transform((value) => normalizeCatalogVisibilityFilter(value)),
});

/** Parsed admin fund list query type. */
export type AdminFundListQuery = z.infer<typeof adminFundListQuerySchema>;

/** Request body schema for manual catalog visibility updates. */
export const adminUpdateCatalogVisibilitySchema = z.object({
  catalogVisibility: catalogVisibilitySchema,
  reason: z.string().trim().min(3).max(500),
  actor: z.string().trim().min(1).max(120).optional(),
});

/** Parsed admin catalog visibility update payload. */
export type AdminUpdateCatalogVisibilityRequest = z.infer<
  typeof adminUpdateCatalogVisibilitySchema
>;

/** Audit row schema returned by admin visibility history endpoints. */
export const catalogVisibilityAuditSchema = z.object({
  id: z.uuid(),
  fundId: z.uuid(),
  previousState: catalogVisibilitySchema,
  newState: catalogVisibilitySchema,
  reason: z.string(),
  actor: z.string(),
  createdAt: z.coerce.date(),
});

/** Admin fund list response reuses the public list envelope. */
export const adminFundListResponseSchema = fundListResponseSchema;

/** Admin catalog visibility audit list response schema. */
export const catalogVisibilityAuditListResponseSchema = z.object({
  data: z.array(catalogVisibilityAuditSchema),
});

/**
 * Parses an admin fund list query from raw HTTP parameters.
 *
 * @param rawQuery - Raw query object from Nest.
 */
export function parseAdminFundListQuery(
  rawQuery: Record<string, unknown>,
): AdminFundListQuery {
  return adminFundListQuerySchema.parse(rawQuery);
}

/**
 * Parses an admin catalog visibility update request body.
 *
 * @param body - Raw request body from Nest.
 */
export function parseAdminUpdateCatalogVisibilityRequest(
  body: unknown,
): AdminUpdateCatalogVisibilityRequest {
  return adminUpdateCatalogVisibilitySchema.parse(body);
}

/**
 * Normalizes optional visibility filters to a unique array.
 *
 * @param value - Single state or list of states from query parsing.
 */
function normalizeCatalogVisibilityFilter(
  value: CatalogVisibility | CatalogVisibility[] | undefined,
): CatalogVisibility[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return [...new Set(Array.isArray(value) ? value : [value])];
}
