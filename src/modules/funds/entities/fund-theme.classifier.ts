import {
  investmentThemeSchema,
  type InvestmentTheme,
} from './investment-theme.schema';

/** Confidence assigned to an automatic theme classification. */
export type FundThemeConfidence = 'high' | 'medium' | 'low';

/** Input fields used to infer a fund investment theme. */
export type FundThemeClassifierInput = {
  readonly name: string;
  readonly benchmark?: string | null;
  readonly assetClass?: string | null;
  readonly description?: string | null;
};

/** Result of the deterministic theme classifier. */
export type FundThemeClassification = {
  readonly theme: InvestmentTheme;
  readonly confidence: FundThemeConfidence;
  readonly matchedRule: string;
};

type ThemeRule = {
  readonly id: string;
  readonly theme: InvestmentTheme;
  readonly confidence: FundThemeConfidence;
  readonly pattern: RegExp;
};

const THEME_RULES: readonly ThemeRule[] = [
  {
    id: 'esg-keywords',
    theme: 'esg',
    confidence: 'high',
    pattern:
      /\b(esg|sustainable|sustainability|clean energy|renewable|solar|carbon|paris[\s-]?aligned|sri|green bond|climate)\b/i,
  },
  {
    id: 'technology-keywords',
    theme: 'technology',
    confidence: 'high',
    pattern:
      /\b(semiconductor|technology|technolog|nasdaq[\s-]?100|\bqqq\b|cyber|artificial intelligence|\bai\b|robotics|cloud computing|internet|fintech|innovation)\b/i,
  },
  {
    id: 'fixed-income-asset-class',
    theme: 'fixed-income',
    confidence: 'high',
    pattern: /\bfixed income\b/i,
  },
  {
    id: 'fixed-income-keywords',
    theme: 'fixed-income',
    confidence: 'high',
    pattern:
      /\b(bond|treasury|aggregate|tips|municipal|high yield|credit|duration|fixed rate|investment grade)\b/i,
  },
  {
    id: 'multi-asset-keywords',
    theme: 'multi-asset',
    confidence: 'high',
    pattern:
      /\b(target date|target-date|balanced|multi[\s-]?asset|allocation|moderate|conservative growth|lifecycle|life cycle|all[\s-]?weather)\b/i,
  },
  {
    id: 'us-equity-benchmark',
    theme: 'us-equity',
    confidence: 'high',
    pattern:
      /\b(s&p\s*500|sp\s*500|russell\s*(200|1000|3000)?|dow jones|total stock market|us total market|wilshire|crsp|nasdaq composite|usa\b|u\.s\.|united states)\b/i,
  },
  {
    id: 'europe-equity-benchmark',
    theme: 'europe-equity',
    confidence: 'high',
    pattern:
      /\b(europe|euro stoxx|stoxx\s*600|ftse\s*100|msci europe|msci emu|dax|cac\s*40|eurozone)\b/i,
  },
  {
    id: 'emerging-equity-benchmark',
    theme: 'emerging-equity',
    confidence: 'high',
    pattern:
      /\b(emerging|em market|frontier|msci em|msci emerging|bric|developing market)\b/i,
  },
  {
    id: 'global-equity-benchmark',
    theme: 'global-equity',
    confidence: 'high',
    pattern:
      /\b(msci world|ftse all[\s-]?world|all[\s-]?country|acwi|global equity|world equity|world stock|world index|developed market)\b/i,
  },
  {
    id: 'sector-other-keywords',
    theme: 'sector-other',
    confidence: 'medium',
    pattern:
      /\b(gold|silver|oil|energy sector|real estate|reit|healthcare sector|financial sector|utilities sector|materials sector|commodity|uranium|biotech|pharma|defense|aerospace|water|infrastructure|timber|agriculture|lithium|copper|metals|mining)\b/i,
  },
];

/**
 * Normalizes classifier input into a single searchable corpus.
 *
 * @param input - Fund metadata used for classification.
 */
function buildClassifierCorpus(input: FundThemeClassifierInput): string {
  return [
    input.name,
    input.benchmark ?? '',
    input.assetClass ?? '',
    input.description ?? '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classifies a fund into a canonical investment theme using deterministic rules.
 *
 * Rules are evaluated in priority order; the first match wins.
 *
 * @param input - Fund metadata from FMP sync or persistence.
 */
export function classifyFundInvestmentTheme(
  input: FundThemeClassifierInput,
): FundThemeClassification {
  const corpus = buildClassifierCorpus(input);

  if (corpus.length === 0) {
    return {
      theme: 'unclassified',
      confidence: 'low',
      matchedRule: 'empty-corpus',
    };
  }

  for (const rule of THEME_RULES) {
    if (rule.pattern.test(corpus)) {
      return {
        theme: investmentThemeSchema.parse(rule.theme),
        confidence: rule.confidence,
        matchedRule: rule.id,
      };
    }
  }

  if (/\bequity\b/i.test(input.assetClass ?? '')) {
    return {
      theme: 'global-equity',
      confidence: 'low',
      matchedRule: 'equity-asset-class-fallback',
    };
  }

  return {
    theme: 'unclassified',
    confidence: 'low',
    matchedRule: 'no-rule-match',
  };
}
