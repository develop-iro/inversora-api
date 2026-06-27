import { Injectable } from '@nestjs/common';

import { FundsRepository } from '../../funds/repositories/funds.repository';
import type { Fund } from '../../funds/entities/fund.schema';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import { ScoringService } from '../../scoring/services/scoring.service';
import type {
  AssistantChatRequest,
  AssistantExplainRequest,
} from '../entities/assistant-context.schema';
import type { AssistantIntent } from '../entities/assistant-context.schema';
import { evaluateComparisonFairness } from '../entities/assistant-comparison.utils';
import type { AssistantRecentMessage } from '../repositories/assistant-conversation.repository';

type AssistantFundPromptContext = {
  isin: string;
  name: string;
  benchmark: string | null;
  ter: number | null;
  trackingError: number | null;
  currency: string;
  vehicle: string;
  score: number | null;
  scoreSummary?: string;
  scoreWarnings?: string[];
  scoreVersion?: string;
  scoreBreakdown?: InvesoraScore['breakdown'];
};

type AssistantComparisonHints = {
  isFair: boolean;
  warnings: readonly string[];
};

/** Factual context passed to OpenAI for grounded explanations. */
export type AssistantPromptContext = {
  surface: AssistantExplainRequest['surface'];
  intent: AssistantIntent;
  locale: string;
  userMessage: string;
  fund?: AssistantFundPromptContext;
  funds?: AssistantFundPromptContext[];
  comparisonHints?: AssistantComparisonHints;
  sessionId?: string;
  recentMessages?: readonly AssistantRecentMessage[];
};

/**
 * Builds factual JSON context for SORA from persisted fund and score data.
 */
@Injectable()
export class AssistantContextBuilderService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Loads fund and score data for the assistant prompt context.
   *
   * @param request - Validated assistant explain request.
   * @param intent - Classified assistant intent.
   */
  async build(
    request: AssistantExplainRequest | AssistantChatRequest,
    intent: AssistantIntent,
    recentMessages: readonly AssistantRecentMessage[] = [],
  ): Promise<AssistantPromptContext> {
    const locale = request.locale ?? 'es';
    const base: AssistantPromptContext = {
      surface: request.surface,
      intent,
      locale,
      userMessage: request.message,
      sessionId: 'sessionId' in request ? request.sessionId : undefined,
      recentMessages: recentMessages.length > 0 ? recentMessages : undefined,
    };

    const requestedIsins = this.getRequestedIsins(request);

    if (requestedIsins.length === 0) {
      return base;
    }

    const persistedFunds =
      await this.fundsRepository.findByIsins(requestedIsins);

    if (persistedFunds.size === 0) {
      return base;
    }

    const includeBreakdown = this.shouldIncludeScoreBreakdown(
      intent,
      request.surface,
    );
    const funds = await Promise.all(
      requestedIsins
        .map((isin) => ({ isin, fund: persistedFunds.get(isin) }))
        .filter(
          (entry): entry is { isin: string; fund: Fund } =>
            entry.fund !== undefined,
        )
        .map((entry) =>
          this.buildFundContext(entry.fund, entry.isin, includeBreakdown),
        ),
    );

    const enriched: AssistantPromptContext = {
      ...base,
      fund: funds.length === 1 ? funds[0] : undefined,
      funds,
    };

    if (
      this.shouldIncludeComparisonHints(intent, request.surface, funds.length)
    ) {
      enriched.comparisonHints = evaluateComparisonFairness(
        funds.map((fund) => ({
          isin: fund.isin,
          benchmark: fund.benchmark,
          currency: fund.currency,
          vehicle: fund.vehicle,
        })),
      );
    }

    return enriched;
  }

  private shouldIncludeScoreBreakdown(
    intent: AssistantIntent,
    surface: AssistantExplainRequest['surface'],
  ): boolean {
    return (
      intent === 'explain_score' ||
      intent === 'compare' ||
      surface === 'fund-detail' ||
      surface === 'compare'
    );
  }

  private shouldIncludeComparisonHints(
    intent: AssistantIntent,
    surface: AssistantExplainRequest['surface'],
    fundCount: number,
  ): boolean {
    return fundCount >= 2 && (intent === 'compare' || surface === 'compare');
  }

  private getRequestedIsins(
    request: AssistantExplainRequest | AssistantChatRequest,
  ): readonly string[] {
    const isins = [
      request.fund?.isin,
      ...('funds' in request
        ? (request.funds?.map((fund) => fund.isin) ?? [])
        : []),
    ].filter((isin): isin is string => isin !== undefined);

    return [...new Set(isins)];
  }

  private async buildFundContext(
    fund: Fund,
    requestedIsin: string,
    includeBreakdown: boolean,
  ): Promise<AssistantFundPromptContext> {
    const score = await this.scoringService.calculateScoreForFundId(fund.id);

    return {
      isin: fund.isin ?? requestedIsin,
      name: fund.name,
      benchmark: fund.benchmark ?? null,
      ter: fund.metrics.ter ?? null,
      trackingError: fund.metrics.trackingError ?? null,
      currency: fund.currency,
      vehicle: fund.vehicle,
      score: score?.score ?? null,
      scoreSummary: score?.summary,
      scoreWarnings: score?.warnings,
      scoreVersion: score?.version,
      scoreBreakdown: includeBreakdown ? score?.breakdown : undefined,
    };
  }
}
