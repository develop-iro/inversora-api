import { Injectable } from '@nestjs/common';

import {
  ASSISTANT_GLOSSARY,
  type GlossaryEntry,
} from '../entities/assistant-glossary.data';
import { normalizeAssistantQuery } from '../entities/assistant-cache.utils';

/** Result of a static glossary lookup. */
export type GlossaryMatch = {
  entry: GlossaryEntry;
  matchedKeyword: string;
};

/**
 * Resolves educational terminology from the static glossary without OpenAI.
 */
@Injectable()
export class GlossaryService {
  /**
   * Attempts to match a user message to a glossary entry.
   *
   * @param message - Raw user message.
   * @returns Glossary match or null when no keyword matches.
   */
  match(message: string): GlossaryMatch | null {
    const normalized = normalizeAssistantQuery(message);

    if (normalized.length === 0) {
      return null;
    }

    let bestMatch: GlossaryMatch | null = null;
    let bestScore = 0;

    for (const entry of ASSISTANT_GLOSSARY) {
      for (const keyword of entry.keywords) {
        const normalizedKeyword = normalizeAssistantQuery(keyword);

        if (normalizedKeyword.length === 0) {
          continue;
        }

        if (!normalized.includes(normalizedKeyword)) {
          continue;
        }

        const score = normalizedKeyword.length;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { entry, matchedKeyword: keyword };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Looks up a glossary entry by term or keyword.
   *
   * @param term - Glossary term or keyword to resolve.
   */
  lookup(term: string): GlossaryEntry | null {
    const normalized = normalizeAssistantQuery(term);

    if (normalized.length === 0) {
      return null;
    }

    for (const entry of ASSISTANT_GLOSSARY) {
      if (normalizeAssistantQuery(entry.term) === normalized) {
        return entry;
      }

      const keywordMatch = entry.keywords.some(
        (keyword) => normalizeAssistantQuery(keyword) === normalized,
      );

      if (keywordMatch) {
        return entry;
      }
    }

    return null;
  }
}
