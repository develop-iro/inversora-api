import { Injectable } from '@nestjs/common';

import type { AssistantIntent } from '../entities/assistant-context.schema';
import { normalizeAssistantQuery } from '../entities/assistant-cache.utils';

const FORBIDDEN_INPUT_PATTERNS: readonly RegExp[] = [
  /\bcompra(r|me|lo|a)\b/i,
  /\bvende(r|me|lo|a)\b/i,
  /\bsuscr[ií]b(e|ete|ir)\b/i,
  /\binvierte\s+(ahora|ya)\b/i,
  /\bmodifica(r)?\s+el\s+(score|ranking)\b/i,
  /\brecalcul(a|ar)\s+(el\s+)?(score|ranking)\b/i,
  /\bcambia(r)?\s+el\s+orden\s+del\s+ranking\b/i,
];

/**
 * Classifies assistant intents and rejects prohibited user requests.
 */
@Injectable()
export class IntentClassifierService {
  /**
   * Returns true when the message asks for prohibited advice or ranking changes.
   *
   * @param message - Raw user message.
   */
  isForbiddenInput(message: string): boolean {
    const normalized = normalizeAssistantQuery(message);
    return FORBIDDEN_INPUT_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  /**
   * Classifies the assistant intent for caching and prompt shaping.
   *
   * @param message - Raw user message.
   * @param hasFundContext - Whether a fund ISIN was provided.
   */
  classify(message: string, hasFundContext: boolean): AssistantIntent {
    const normalized = normalizeAssistantQuery(message);

    if (
      /\b(compar|versus|vs|diferencia entre)\b/.test(normalized) ||
      normalized.includes('comparar')
    ) {
      return 'compare';
    }

    if (
      hasFundContext &&
      (/\bscore\b/.test(normalized) ||
        normalized.includes('puntuacion') ||
        normalized.includes('ranking') ||
        normalized.includes('por que este') ||
        normalized.includes('porque este'))
    ) {
      return 'explain_score';
    }

    if (
      normalized.includes('que es') ||
      normalized.includes('que significa') ||
      normalized.includes('explica') ||
      normalized.includes('define') ||
      normalized.includes('significa')
    ) {
      return 'explain_term';
    }

    return 'general';
  }
}
