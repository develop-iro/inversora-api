import { z } from 'zod';
import type { ManualSyncOptions } from '../../funds/services/fund-daily-sync.types';

/** ISO date string pattern used for optional historical price bounds. */
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/** Zod schema for manual admin sync request bodies. */
export const adminSyncRequestSchema = z.object({
  symbols: z.array(z.string().trim().min(1)).optional(),
  steps: z
    .object({
      metadata: z.boolean().optional(),
      prices: z.boolean().optional(),
      composition: z.boolean().optional(),
      scoring: z.boolean().optional(),
    })
    .optional(),
  incrementalPrices: z.boolean().optional(),
  historyFrom: z.string().regex(isoDatePattern).optional(),
  historyTo: z.string().regex(isoDatePattern).optional(),
});

/** Validated manual admin sync request payload. */
export type AdminSyncRequest = z.infer<typeof adminSyncRequestSchema>;

/**
 * Parses and validates a manual admin sync request body.
 *
 * @param body - Raw request body from HTTP or CLI input.
 * @returns Parsed manual sync request.
 * @throws {z.ZodError} When validation fails.
 */
export function parseAdminSyncRequest(body: unknown): AdminSyncRequest {
  return adminSyncRequestSchema.parse(body);
}

/**
 * Maps a validated admin sync request to manual sync service options.
 *
 * @param request - Validated admin sync request.
 * @returns Options for {@link FundDailySyncService.runManualSync}.
 */
export function mapAdminSyncRequestToManualSyncOptions(
  request: AdminSyncRequest,
): ManualSyncOptions {
  return {
    symbols: request.symbols,
    steps: request.steps,
    incrementalPrices: request.incrementalPrices,
    historyFrom: request.historyFrom,
    historyTo: request.historyTo,
  };
}
