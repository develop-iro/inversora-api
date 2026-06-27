import { z } from 'zod';

export const assistantToolIsinSchema = z
  .string()
  .trim()
  .min(12)
  .max(12)
  .transform((value) => value.toUpperCase());

export const assistantToolCompareRequestSchema = z.object({
  isins: z.array(assistantToolIsinSchema).min(1).max(5),
});

export type AssistantToolCompareRequest = z.infer<
  typeof assistantToolCompareRequestSchema
>;

export function parseAssistantToolIsin(value: unknown): string {
  return assistantToolIsinSchema.parse(value);
}

export function parseAssistantToolCompareRequest(
  value: unknown,
): AssistantToolCompareRequest {
  return assistantToolCompareRequestSchema.parse(value);
}

export const assistantToolGlossaryTermSchema = z.string().trim().min(1).max(80);

export function parseAssistantToolGlossaryTerm(value: unknown): string {
  return assistantToolGlossaryTermSchema.parse(value);
}
