import { Injectable } from '@nestjs/common';

import type { AssistantIntent } from '../entities/assistant-context.schema';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import type { AssistantPromptContext } from './assistant-context.builder';

type ScoreBreakdownEntry =
  InvesoraScore['breakdown'][keyof InvesoraScore['breakdown']];

export type DeterministicAssistantResult = {
  readonly title: string;
  readonly text: string;
};

/**
 * Builds zero-token educational responses from factual assistant context.
 */
@Injectable()
export class DeterministicAssistantService {
  /**
   * Attempts to build a template response for supported intents.
   *
   * @param context - Factual assistant context.
   * @param intent - Classified intent.
   */
  tryBuild(
    context: AssistantPromptContext,
    intent: AssistantIntent,
  ): DeterministicAssistantResult | null {
    if (intent === 'explain_score') {
      return this.buildScoreExplanation(context);
    }

    if (intent === 'compare') {
      return this.buildCompareExplanation(context);
    }

    return null;
  }

  private buildScoreExplanation(
    context: AssistantPromptContext,
  ): DeterministicAssistantResult | null {
    const fund = context.fund;

    if (fund === undefined || fund.score === null) {
      return null;
    }

    const breakdownLines =
      fund.scoreBreakdown === undefined
        ? []
        : Object.entries(fund.scoreBreakdown).map(
            ([key, value]) =>
              `${key}: ${this.formatScoreBreakdownEntry(value)}`,
          );

    const warnings =
      fund.scoreWarnings !== undefined && fund.scoreWarnings.length > 0
        ? ` Advertencias de calidad de datos: ${fund.scoreWarnings.join('; ')}.`
        : '';

    const breakdownText =
      breakdownLines.length > 0
        ? ` Desglose disponible: ${breakdownLines.join(', ')}.`
        : '';

    return {
      title: 'Explicación del Score Inversora',
      text:
        `${fund.name} (${fund.isin}) tiene un Score Inversora de ${fund.score.toFixed(0)} sobre 100. ` +
        `${fund.scoreSummary ?? 'El score resume comisiones, tracking error, tamaño, antigüedad y calidad de datos con reglas objetivas.'}` +
        `${breakdownText}${warnings} ` +
        'Este score ayuda a comparar fondos dentro de una categoría homogénea; no es una recomendación de compra.',
    };
  }

  private buildCompareExplanation(
    context: AssistantPromptContext,
  ): DeterministicAssistantResult | null {
    const funds =
      context.funds ?? (context.fund !== undefined ? [context.fund] : []);

    if (funds.length < 2) {
      return null;
    }

    const rows = funds.map((fund) => {
      const ter =
        fund.ter !== null ? `${fund.ter.toFixed(2)}%` : 'TER no disponible';
      const score =
        fund.score !== null
          ? `${fund.score.toFixed(0)}/100`
          : 'score no disponible';

      return `${fund.name} (${fund.isin}): TER ${ter}, Score ${score}`;
    });

    const fairness = context.comparisonHints;
    const fairnessText =
      fairness === undefined
        ? ''
        : fairness.isFair
          ? ' La comparación parece homogénea entre fondos similares.'
          : ` Atención: ${fairness.warnings.join(' ')}`;

    return {
      title: 'Cómo comparar fondos en Inversora',
      text:
        `Comparativa educativa entre ${funds.length} fondos. ${rows.join('. ')}.${fairnessText} ` +
        'Compara siempre fondos del mismo benchmark o categoría y recuerda que la rentabilidad pasada no garantiza resultados futuros.',
    };
  }

  private formatScoreBreakdownEntry(entry: ScoreBreakdownEntry): string {
    const suffix = entry.incomplete === true ? ', incompleto' : '';

    return `${entry.points.toFixed(0)}/${entry.maxPoints.toFixed(0)} (${entry.label}${suffix})`;
  }
}
