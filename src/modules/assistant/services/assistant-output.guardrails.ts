import { Injectable } from '@nestjs/common';

import type { AssistantExplainResponse } from '../entities/assistant-context.schema';

const FORBIDDEN_OUTPUT_PATTERNS: readonly RegExp[] = [
  /\bcompra(r|me|lo|a)\b/i,
  /\bvende(r|me|lo|a)\b/i,
  /\bsuscr[ií]b(e|ete|ir)\b/i,
  /\bdeber[ií]as\s+invertir\b/i,
  /\bdeber[ií]as\b/i,
  /\binvierte\s+(ahora|ya)\b/i,
  /\bte recomiendo\b/i,
  /\bmejor opci[oó]n\b/i,
  /\bideal para ti\b/i,
  /\bapuesta por\b/i,
];

/** Safe educational fallback when model output violates guardrails. */
export const ASSISTANT_GUARDRAIL_FALLBACK_TEXT =
  'Inversora comparte información educativa. No puedo recomendar comprar, vender o suscribir un fondo concreto. Si quieres, te explico conceptos, métricas o el significado del score en lenguaje sencillo.';

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
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      throw new Error('Assistant response was empty');
    }

    if (FORBIDDEN_OUTPUT_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      throw new Error(
        'Assistant response contained prohibited recommendation language',
      );
    }

    if (trimmed.length <= MAX_RESPONSE_LENGTH) {
      return trimmed;
    }

    return `${trimmed.slice(0, MAX_RESPONSE_LENGTH - 1).trimEnd()}…`;
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
