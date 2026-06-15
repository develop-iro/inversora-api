import { Injectable, NotFoundException } from '@nestjs/common';
import type { CatalogVisibility } from '../entities/catalog-visibility.schema';
import { isCatalogVisible } from '../entities/catalog-visibility.schema';
import {
  buildAutomaticCatalogVisibilityReason,
  resolveAutomaticCatalogVisibility,
} from '../entities/catalog-visibility.utils';
import type { Fund } from '../entities/fund.schema';
import { FundsRepository } from '../repositories/funds.repository';

/** Input for a manual catalog visibility change. */
export type UpdateCatalogVisibilityInput = {
  fundId: string;
  catalogVisibility: CatalogVisibility;
  reason: string;
  actor?: string;
};

/** Persisted audit row for catalog visibility transitions. */
export type CatalogVisibilityAuditEntry = {
  id: string;
  fundId: string;
  previousState: CatalogVisibility;
  newState: CatalogVisibility;
  reason: string;
  actor: string;
  createdAt: Date;
};

/**
 * Manages catalog visibility rules, public access checks, and audit logging.
 */
@Injectable()
export class CatalogVisibilityService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Throws `NotFoundException` when a fund must not be exposed on public endpoints.
   *
   * @param fund - Persisted fund entity.
   */
  assertPublicCatalogVisible(fund: Fund): void {
    if (!isCatalogVisible(fund)) {
      throw new NotFoundException(`Fund ${fund.id} was not found`);
    }
  }

  /**
   * Applies automatic catalog visibility rules after sync or scoring updates.
   *
   * @param fund - Latest persisted fund entity.
   * @returns Updated fund when visibility changed; otherwise the original entity.
   */
  async applyAutomaticVisibilityRules(fund: Fund): Promise<Fund> {
    const nextVisibility = resolveAutomaticCatalogVisibility(fund);

    if (nextVisibility === fund.catalogVisibility) {
      return fund;
    }

    return this.fundsRepository.updateCatalogVisibility({
      fundId: fund.id,
      catalogVisibility: nextVisibility,
      reason: buildAutomaticCatalogVisibilityReason(fund, nextVisibility),
      actor: 'system',
    });
  }

  /**
   * Updates catalog visibility through the admin API and records an audit row.
   *
   * @param input - Manual visibility change request.
   * @returns Updated fund entity.
   */
  async updateCatalogVisibility(
    input: UpdateCatalogVisibilityInput,
  ): Promise<Fund> {
    const fund = await this.fundsRepository.findById(input.fundId);

    if (fund === null) {
      throw new NotFoundException(`Fund ${input.fundId} was not found`);
    }

    if (fund.catalogVisibility === input.catalogVisibility) {
      return fund;
    }

    return this.fundsRepository.updateCatalogVisibility({
      fundId: fund.id,
      catalogVisibility: input.catalogVisibility,
      reason: input.reason,
      actor: input.actor ?? 'admin',
    });
  }

  /**
   * Returns audit history for a fund's catalog visibility transitions.
   *
   * @param fundId - Persisted fund identifier.
   */
  async listVisibilityAudits(
    fundId: string,
  ): Promise<CatalogVisibilityAuditEntry[]> {
    const fund = await this.fundsRepository.findById(fundId);

    if (fund === null) {
      throw new NotFoundException(`Fund ${fundId} was not found`);
    }

    return this.fundsRepository.findCatalogVisibilityAudits(fundId);
  }
}
