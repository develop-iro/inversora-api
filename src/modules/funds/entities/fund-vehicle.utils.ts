import type { Fund, FundVehicleType } from './fund.schema';

/**
 * Returns the Spanish product label for a fund vehicle type.
 *
 * @param vehicle - Persisted fund vehicle.
 */
export function buildVehicleLabel(vehicle: FundVehicleType): string {
  return vehicle === 'etf' ? 'ETF' : 'Fondo indexado';
}

/**
 * Builds a human-readable category label for catalog and featured cards.
 *
 * @param fund - Fund fields required to derive the label.
 */
export function buildCategoryLabel(
  fund: Pick<Fund, 'benchmark' | 'vehicle'>,
): string {
  const vehicleLabel = buildVehicleLabel(fund.vehicle);

  if (fund.benchmark !== null) {
    return `${vehicleLabel} · ${fund.benchmark}`;
  }

  return vehicleLabel;
}

/**
 * Builds the profile description shown in fund detail.
 *
 * @param fund - Fund fields required to derive the description.
 */
export function buildProductDescription(
  fund: Pick<Fund, 'benchmark' | 'vehicle'>,
): string {
  if (fund.benchmark !== null) {
    return fund.vehicle === 'etf'
      ? `ETF que replica ${fund.benchmark}.`
      : `Fondo indexado que replica ${fund.benchmark}.`;
  }

  return `${buildVehicleLabel(fund.vehicle)}.`;
}

/**
 * Builds the benefit summary copy for featured and detail cards.
 *
 * @param fund - Fund fields required to derive the summary.
 */
export function buildBenefitSummary(
  fund: Pick<Fund, 'benchmark' | 'vehicle'>,
): string {
  if (fund.benchmark !== null) {
    return fund.vehicle === 'etf'
      ? `ETF con referencia ${fund.benchmark}.`
      : `Fondo indexado con referencia ${fund.benchmark}.`;
  }

  return buildVehicleLabel(fund.vehicle);
}
