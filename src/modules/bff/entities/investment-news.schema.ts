import { z } from 'zod';

/** Supported educational news categories for the home feed. */
export const investmentNewsCategorySchema = z.enum([
  'concepto',
  'mercado',
  'regulacion',
]);

const safeNewsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), {
    message: 'News URLs must use HTTPS',
  });

/**
 * Validates a curated news URL before it is exposed by the API.
 *
 * @param url - External news URL.
 */
export function assertSafeNewsUrl(url: string): string {
  return safeNewsUrlSchema.parse(url);
}

/** Single curated investment news item for the mobile home feed. */
export const investmentNewsItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  source: z.string().min(1),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: investmentNewsCategorySchema,
  url: safeNewsUrlSchema.optional(),
});

/** Query schema for `GET /news`. */
export const investmentNewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

/** Response schema for `GET /news`. */
export const investmentNewsResponseSchema = z.object({
  data: z.array(investmentNewsItemSchema),
});

/** Parsed query type for `GET /news`. */
export type InvestmentNewsQuery = z.infer<typeof investmentNewsQuerySchema>;

/** Investment news item returned by the BFF. */
export type InvestmentNewsItem = z.infer<typeof investmentNewsItemSchema>;

/** Response type for `GET /news`. */
export type InvestmentNewsResponse = z.infer<
  typeof investmentNewsResponseSchema
>;
