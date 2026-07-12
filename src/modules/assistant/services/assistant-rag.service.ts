import { Injectable } from '@nestjs/common';

import {
  ASSISTANT_RAG_CHUNKS,
  type AssistantRagChunk,
} from '../entities/assistant-rag.data';
import { normalizeAssistantQuery } from '../entities/assistant-cache.utils';
import type { AssistantIntent } from '../entities/assistant-context.schema';

export type AssistantRagRetrievalResult = {
  readonly chunks: readonly AssistantRagChunk[];
  readonly queryTerms: readonly string[];
};

/**
 * Retrieves educational document chunks via lightweight keyword scoring (MVP RAG).
 */
@Injectable()
export class AssistantRagService {
  /**
   * Retrieves top-k educational chunks for a user query.
   *
   * @param message - Raw user message.
   * @param intent - Classified intent used to bias topic selection.
   * @param limit - Maximum number of chunks to return.
   */
  retrieve(
    message: string,
    intent: AssistantIntent,
    limit = 4,
  ): AssistantRagRetrievalResult {
    const normalized = normalizeAssistantQuery(message);
    const queryTerms = normalized
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2);

    const intentTopicBias = this.resolveIntentTopicBias(intent);

    const ranked = ASSISTANT_RAG_CHUNKS.map((chunk) => ({
      chunk,
      score: this.scoreChunk(chunk, queryTerms, intentTopicBias),
    }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((entry) => entry.chunk);

    return {
      chunks: ranked,
      queryTerms,
    };
  }

  /**
   * Formats retrieved chunks for LLM grounding.
   *
   * @param chunks - Retrieved educational chunks.
   */
  formatChunksForPrompt(chunks: readonly AssistantRagChunk[]): string {
    if (chunks.length === 0) {
      return 'Sin fragmentos documentales adicionales.';
    }

    return chunks
      .map(
        (chunk, index) =>
          `[Doc ${index + 1} | ${chunk.topic} | ${chunk.sourceFile}]\n${chunk.content}`,
      )
      .join('\n\n');
  }

  private resolveIntentTopicBias(intent: AssistantIntent): string | null {
    switch (intent) {
      case 'explain_score':
        return 'scoring';
      case 'compare':
        return 'comparacion';
      case 'explain_term':
        return 'conceptos';
      case 'glossary':
        return 'comisiones';
      case 'general':
        return null;
      default: {
        const exhaustiveCheck: never = intent;
        return exhaustiveCheck;
      }
    }
  }

  private scoreChunk(
    chunk: AssistantRagChunk,
    queryTerms: readonly string[],
    intentTopicBias: string | null,
  ): number {
    let score = 0;

    for (const term of queryTerms) {
      if (
        chunk.keywords.some(
          (keyword) => keyword.includes(term) || term.includes(keyword),
        )
      ) {
        score += 2;
      }

      if (chunk.content.toLowerCase().includes(term)) {
        score += 1;
      }
    }

    if (intentTopicBias !== null && chunk.topic === intentTopicBias) {
      score += 1;
    }

    return score;
  }
}
