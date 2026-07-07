import {
  classifyFundInvestmentTheme,
  type FundThemeClassifierInput,
  type FundThemeClassification,
} from './fund-theme.classifier';
import { resolveInvestmentThemeLabel } from './investment-theme.schema';

/** Theme fields resolved during provider sync. */
export type ResolvedFundThemeSyncFields = {
  readonly classification: FundThemeClassification;
  readonly investmentTheme: FundThemeClassification['theme'];
  readonly themeLabel: string;
};

/**
 * Resolves investment theme fields for fund sync without overwriting curated copy.
 *
 * `themeLabel` is auto-filled only when the persisted label is empty.
 *
 * @param input - Classifier input from the provider profile.
 * @param existingThemeLabel - Persisted editorial theme label, if any.
 */
export function resolveFundThemeSyncFields(
  input: FundThemeClassifierInput,
  existingThemeLabel?: string,
): ResolvedFundThemeSyncFields {
  const classification = classifyFundInvestmentTheme(input);
  const trimmedExistingThemeLabel = existingThemeLabel?.trim() ?? '';
  const themeLabel =
    trimmedExistingThemeLabel.length > 0
      ? trimmedExistingThemeLabel
      : resolveInvestmentThemeLabel(classification.theme);

  return {
    classification,
    investmentTheme: classification.theme,
    themeLabel,
  };
}
