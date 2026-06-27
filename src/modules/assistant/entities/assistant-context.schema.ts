import { z } from 'zod';

/** Supported UI surfaces that can invoke SORA. */
export const assistantSurfaceSchema = z.enum([
  'home',
  'fund-detail',
  'catalog',
  'ranking',
  'compare',
]);

/** Supported assistant locales (MVP: Spanish only). */
export const assistantLocaleSchema = z.enum(['es']).default('es');

const assistantFundContextSchema = z.object({
  isin: z
    .string()
    .trim()
    .min(12)
    .max(12)
    .transform((value) => value.toUpperCase()),
});

/** Request payload for `POST /assistant/explain`. */
export const assistantExplainRequestSchema = z.object({
  surface: assistantSurfaceSchema,
  message: z.string().trim().min(1).max(500),
  fund: assistantFundContextSchema.optional(),
  locale: assistantLocaleSchema.optional(),
});

/** Request payload for `POST /assistant/chat`. */
export const assistantChatRequestSchema = z.object({
  surface: assistantSurfaceSchema,
  message: z.string().trim().min(1).max(1_000),
  sessionId: z.string().trim().min(1).max(120).optional(),
  fund: assistantFundContextSchema.optional(),
  funds: z.array(assistantFundContextSchema).min(1).max(5).optional(),
  locale: assistantLocaleSchema.optional(),
});

/** Assistant response source layer. */
export const assistantResponseSourceSchema = z.enum([
  'glossary',
  'cache',
  'openai',
]);

/** Response payload for `POST /assistant/explain`. */
export const assistantExplainResponseSchema = z.object({
  text: z.string().min(1),
  title: z.string().min(1).optional(),
  source: assistantResponseSourceSchema,
  cached: z.boolean(),
  disclaimer: z.string().min(1),
  relatedFundIsin: z.string().optional(),
  promptVersion: z.string().min(1),
});

/** Response payload for `POST /assistant/chat`. */
export const assistantChatResponseSchema =
  assistantExplainResponseSchema.extend({
    sessionId: z.string().optional(),
  });

/** Classified assistant intent used for cache keys and prompts. */
export const assistantIntentSchema = z.enum([
  'glossary',
  'explain_term',
  'explain_score',
  'compare',
  'general',
]);

export type AssistantSurface = z.infer<typeof assistantSurfaceSchema>;
export type AssistantExplainRequest = z.infer<
  typeof assistantExplainRequestSchema
>;
export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;
export type AssistantExplainResponse = z.infer<
  typeof assistantExplainResponseSchema
>;
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
export type AssistantIntent = z.infer<typeof assistantIntentSchema>;
export type AssistantResponseSource = z.infer<
  typeof assistantResponseSourceSchema
>;

/**
 * Parses and validates an assistant explain request body.
 *
 * @param body - Raw HTTP request body.
 * @returns Validated assistant explain request.
 */
export function parseAssistantExplainRequest(
  body: unknown,
): AssistantExplainRequest {
  return assistantExplainRequestSchema.parse(body);
}

/**
 * Parses and validates an assistant chat request body.
 *
 * @param body - Raw HTTP request body.
 * @returns Validated assistant chat request.
 */
export function parseAssistantChatRequest(body: unknown): AssistantChatRequest {
  return assistantChatRequestSchema.parse(body);
}
