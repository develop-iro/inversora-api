import { Injectable } from '@nestjs/common';

import type { AssistantExplainResponse } from '../entities/assistant-context.schema';

const FORBIDDEN_OUTPUT_PATTERNS: readonly RegExp[] = [
  /\bcompra(r|me|lo|la)?\b/i,
  /\bvende(r|me|lo|la)?\b/i,
  /\bsuscrib(e|ete|ir)\b/i,
  /\bsuscribe(te)?\b/i,
  /\binvierte?\s+en\b/i,
  /\bdeberias\s+invertir\b/i,
  /\bdebes\s+invertir\b/i,
  /\binvierte\s+(ahora|ya)\b/i,
  /\bte recomiendo\b/i,
  /\bmi recomendacion\b/i,
  /\bmejor opcion\b/i,
  /\bideal para ti\b/i,
  /\bapuesta por\b/i,
  /\bbuy\s+(this|it|now|the)\b/i,
  /\bsell\s+(this|it|now|the)\b/i,
  /\byou should\s+(buy|sell|invest)\b/i,
  /\bi recommend\s+(buying|selling|investing)\b/i,
  /\bbest option for you\b/i,
];

/** Safe educational fallback when model output violates guardrails. */
export const ASSISTANT_GUARDRAIL_FALLBACK_TEXT =
  'Inversora comparte informacion educativa. No puedo dar instrucciones operativas sobre un fondo concreto. Puedo explicarte conceptos, metricas o el significado del score en lenguaje sencillo.';

const MAX_RESPONSE_LENGTH = 2_000;

/**
 * Validates and sanitizes assistant model output before returning to clients.
 */
@Injectable()
export class AssistantOutputGuardrailsService {
  /**
   * Applies guardrails to model output text.
   *
   * @param text - Raw model output.
   * @returns Sanitized text safe for educational display.
   * @throws {Error} When output contains prohibited recommendation language.
   */
  sanitize(text: string): string {
    const trimmed = normalizeForGuardrails(text.trim());

    if (trimmed.length === 0) {
      throw new Error('Assistant response was empty');
    }

    if (FORBIDDEN_OUTPUT_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      throw new Error(
        'Assistant response contained prohibited recommendation language',
      );
    }

    if (trimmed.length <= MAX_RESPONSE_LENGTH) {
      return text.trim();
    }

    return `${text
      .trim()
      .slice(0, MAX_RESPONSE_LENGTH - 3)
      .trimEnd()}...`;
  }

  /**
   * Sanitizes model output or returns a safe educational fallback.
   *
   * @param text - Raw model output.
   */
  sanitizeOrFallback(text: string): string {
    try {
      return this.sanitize(text);
    } catch {
      return ASSISTANT_GUARDRAIL_FALLBACK_TEXT;
    }
  }

  /**
   * Validates a cached or glossary response payload.
   *
   * @param response - Assistant response payload.
   */
  assertResponse<T extends AssistantExplainResponse>(response: T): T {
    return {
      ...response,
      text: this.sanitize(response.text),
    };
  }
}

function normalizeForGuardrails(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, '')
    .toLowerCase();
}
