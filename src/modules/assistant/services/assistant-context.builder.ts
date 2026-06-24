import { Injectable } from '@nestjs/common';

import { FundsRepository } from '../../funds/repositories/funds.repository';
import { ScoringService } from '../../scoring/services/scoring.service';
import type { AssistantExplainRequest } from '../entities/assistant-context.schema';
import type { AssistantIntent } from '../entities/assistant-context.schema';

/** Factual context passed to OpenAI for grounded explanations. */
export type AssistantPromptContext = {
  surface: AssistantExplainRequest['surface'];
  intent: AssistantIntent;
  locale: string;
  userMessage: string;
  fund?: {
    isin: string;
    name: string;
    benchmark: string | null;
    ter: number | null;
    score: number | null;
    scoreSummary?: string;
    scoreWarnings?: string[];
    scoreVersion?: string;
  };
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
    request: AssistantExplainRequest,
    intent: AssistantIntent,
  ): Promise<AssistantPromptContext> {
    const locale = request.locale ?? 'es';
    const base: AssistantPromptContext = {
      surface: request.surface,
      intent,
      locale,
      userMessage: request.message,
    };

    if (request.fund === undefined) {
      return base;
    }

    const fund = await this.fundsRepository.findByIsin(request.fund.isin);

    if (fund === null) {
      return base;
    }

    const score = await this.scoringService.calculateScoreForFundId(fund.id);

    return {
      ...base,
      fund: {
        isin: fund.isin ?? request.fund.isin,
        name: fund.name,
        benchmark: fund.benchmark ?? null,
        ter: fund.metrics.ter ?? null,
        score: score?.score ?? null,
        scoreSummary: score?.summary,
        scoreWarnings: score?.warnings,
        scoreVersion: score?.version,
      },
    };
  }
}
