import { Injectable } from '@nestjs/common';

import type { AssistantIntent } from '../entities/assistant-context.schema';
import type { AssistantPromptContext } from './assistant-context.builder';

export type AssistantConfidenceInput = {
  readonly text: string;
  readonly intent: AssistantIntent;
  readonly context: AssistantPromptContext;
  readonly guardrailsPass: boolean;
};

export type AssistantConfidenceResult = {
  readonly score: number;
  readonly guardrailsPass: boolean;
  readonly hasRequiredFundRefs: boolean;
  readonly responseLengthOk: boolean;
};

/**
 * Heuristic confidence scoring for primary LLM outputs (no extra LLM call).
 */
@Injectable()
export class AssistantConfidenceService {
  /**
   * Computes a weighted confidence score in the range [0, 1].
   *
   * @param input - Generated text and grounding context.
   */
  evaluate(input: AssistantConfidenceInput): AssistantConfidenceResult {
    const responseLengthOk = input.text.trim().length >= 20;
    const hasRequiredFundRefs = this.hasRequiredFundReferences(
      input.text,
      input.intent,
      input.context,
    );
    const guardrailsPass = input.guardrailsPass;

    const score =
      (guardrailsPass ? 0.4 : 0) +
      (hasRequiredFundRefs ? 0.35 : 0) +
      (responseLengthOk ? 0.25 : 0);

    return {
      score,
      guardrailsPass,
      hasRequiredFundRefs,
      responseLengthOk,
    };
  }

  private hasRequiredFundReferences(
    text: string,
    intent: AssistantIntent,
    context: AssistantPromptContext,
  ): boolean {
    const normalized = text.toLowerCase();

    if (intent !== 'explain_score' && intent !== 'compare') {
      return true;
    }

    const fund = context.fund;
    const funds = context.funds ?? (fund !== undefined ? [fund] : []);

    if (funds.length === 0) {
      return true;
    }

    return funds.some((entry) => {
      const isinMatch = normalized.includes(entry.isin.toLowerCase());
      const nameToken = entry.name.split(' ')[0]?.toLowerCase();
      const nameMatch =
        nameToken !== undefined && nameToken.length > 2
          ? normalized.includes(nameToken)
          : false;
      const terMatch =
        entry.ter !== null &&
        normalized.includes(String(entry.ter).slice(0, 4));
      const scoreMatch =
        entry.score !== null &&
        normalized.includes(String(Math.round(entry.score)));

      return isinMatch || nameMatch || terMatch || scoreMatch;
    });
  }
}
