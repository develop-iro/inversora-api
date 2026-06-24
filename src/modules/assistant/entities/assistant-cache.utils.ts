import { createHash } from 'node:crypto';

import type { AssistantIntent } from './assistant-context.schema';

/**
 * Normalizes user text for glossary matching and cache keys.
 *
 * @param value - Raw user message.
 * @returns Lowercase text without accents and extra whitespace.
 */
export function normalizeAssistantQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a deterministic cache key for assistant responses.
 *
 * @param input - Cache key components.
 * @returns SHA-256 hex digest.
 */
export function buildAssistantCacheKey(input: {
  intent: AssistantIntent;
  normalizedQuery: string;
  fundIsin?: string;
  scoreVersion: string;
  promptVersion: string;
  locale: string;
}): string {
  const payload = [
    input.intent,
    input.normalizedQuery,
    input.fundIsin ?? '',
    input.scoreVersion,
    input.promptVersion,
    input.locale,
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Computes cache expiration from TTL in days.
 *
 * @param ttlDays - Number of days until expiry.
 * @returns Expiration timestamp.
 */
export function computeAssistantCacheExpiry(ttlDays: number): Date {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ttlDays);
  return expiresAt;
}
