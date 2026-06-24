import { Injectable } from '@nestjs/common';

import type { AssistantExplainResponse } from '../entities/assistant-context.schema';

const FORBIDDEN_OUTPUT_PATTERNS: readonly RegExp[] = [
  /\bcompra(r|me|lo|a)\b/i,
  /\bvende(r|me|lo|a)\b/i,
  /\bsuscr[ií]b(e|ete|ir)\b/i,
  /\bdeber[ií]as\s+invertir\b/i,
  /\binvierte\s+(ahora|ya)\b/i,
];

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
   * Validates a cached or glossary response payload.
   *
   * @param response - Assistant response payload.
   */
  assertResponse(response: AssistantExplainResponse): AssistantExplainResponse {
    return {
      ...response,
      text: this.sanitize(response.text),
    };
  }
}
