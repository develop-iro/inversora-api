/** Minimal fund fields required to evaluate educational comparison fairness. */
export type ComparisonFundProfile = {
  readonly isin: string;
  readonly benchmark: string | null;
  readonly currency: string;
  readonly vehicle: string;
};

/** Result of a fairness check for an educational fund comparison. */
export type ComparisonFairnessResult = {
  readonly isFair: boolean;
  readonly warnings: readonly string[];
  readonly funds: readonly ComparisonFundProfile[];
};

/**
 * Evaluates whether selected funds can be compared fairly in educational copy.
 *
 * @param funds - Fund profiles selected for comparison.
 */
export function evaluateComparisonFairness(
  funds: readonly ComparisonFundProfile[],
): ComparisonFairnessResult {
  if (funds.length < 2) {
    return {
      isFair: true,
      warnings: [],
      funds,
    };
  }

  const warnings: string[] = [];
  const benchmarks = new Set(
    funds
      .map((fund) => fund.benchmark?.trim().toLowerCase())
      .filter(
        (value): value is string => value !== undefined && value.length > 0,
      ),
  );
  const currencies = new Set(
    funds.map((fund) => fund.currency.trim().toUpperCase()),
  );
  const vehicles = new Set(
    funds.map((fund) => fund.vehicle.trim().toLowerCase()),
  );

  if (benchmarks.size > 1) {
    warnings.push(
      'Los fondos tienen benchmarks distintos; la comparacion tecnica puede no ser homogenea.',
    );
  }

  if (currencies.size > 1) {
    warnings.push(
      'Los fondos usan divisas distintas; conviene comparar costes y metricas con cautela.',
    );
  }

  if (vehicles.size > 1) {
    warnings.push(
      'Los vehiculos de inversion difieren (por ejemplo ETF vs fondo); la comparacion puede no ser directa.',
    );
  }

  return {
    isFair: warnings.length === 0,
    warnings,
    funds,
  };
}
