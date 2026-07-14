import type { Prisma } from '@prisma/client';
import type { CatalogRiskProfile } from '../../../core/api/schemas/catalog-risk-profile.schema';

/**
 * Builds a Prisma filter for catalog risk profiles.
 *
 * Aligns with app mapping (`mapRiskLevelToApp` / `mapApiRiskLevelToApp`):
 * unknown (`null`) risk is treated as medium.
 *
 * @param riskProfile - Catalog risk profile filter.
 */
export function buildRiskProfileWhereInput(
  riskProfile: CatalogRiskProfile,
): Prisma.FundWhereInput | null {
  switch (riskProfile) {
    case 'low':
      return { riskLevel: { gte: 1, lte: 2 } };
    case 'medium':
      return {
        OR: [{ riskLevel: null }, { riskLevel: { gte: 3, lte: 5 } }],
      };
    case 'high':
      return { riskLevel: { gte: 6, lte: 7 } };
    case 'all':
      return null;
    default: {
      const exhaustive: never = riskProfile;
      return exhaustive;
    }
  }
}
