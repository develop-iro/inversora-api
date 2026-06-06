import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  formatFundPriceDate,
  parseFundPriceDate,
} from '../entities/fund-price.mapper';
import {
  mapFundAllocationCategoryToPrisma,
  mapPrismaFundAllocationToFundAllocation,
  mapPrismaFundHoldingToFundHolding,
  mapUpsertFundAllocationInputToPrismaData,
  mapUpsertFundHoldingInputToPrismaData,
} from '../entities/fund-composition.mapper';
import type {
  FundAllocation,
  FundAllocationCategory,
  FundComposition,
  FundHolding,
  ReplaceFundCompositionInput,
} from '../entities/fund-composition.schema';

/**
 * Persistence layer for fund portfolio composition snapshots.
 */
@Injectable()
export class FundCompositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replaces a composition snapshot for a fund on a given date.
   *
   * @param fundId - Persisted fund identifier.
   * @param snapshot - Holdings and allocation slices for the snapshot.
   * @returns Counts of persisted holdings and allocation rows.
   */
  async replaceSnapshot(
    fundId: string,
    snapshot: ReplaceFundCompositionInput,
  ): Promise<{ holdings: number; allocations: number }> {
    const asOfDate = parseFundPriceDate(snapshot.asOf);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.fundHolding.deleteMany({
        where: {
          fundId,
          asOf: asOfDate,
        },
      });
      await transaction.fundAllocation.deleteMany({
        where: {
          fundId,
          asOf: asOfDate,
        },
      });

      if (snapshot.holdings.length > 0) {
        await transaction.fundHolding.createMany({
          data: snapshot.holdings.map((holding) =>
            mapUpsertFundHoldingInputToPrismaData(
              fundId,
              snapshot.asOf,
              holding,
            ),
          ),
        });
      }

      if (snapshot.allocations.length > 0) {
        await transaction.fundAllocation.createMany({
          data: snapshot.allocations.map((allocation) =>
            mapUpsertFundAllocationInputToPrismaData(
              fundId,
              snapshot.asOf,
              allocation,
            ),
          ),
        });
      }
    });

    return {
      holdings: snapshot.holdings.length,
      allocations: snapshot.allocations.length,
    };
  }

  /**
   * Reads a composition snapshot for a fund.
   *
   * @param fundId - Persisted fund identifier.
   * @param asOf - Optional snapshot date; latest snapshot is used when omitted.
   * @returns Composition snapshot or `null` when no data exists.
   */
  async findSnapshot(
    fundId: string,
    asOf?: string,
  ): Promise<FundComposition | null> {
    const resolvedAsOf = asOf ?? (await this.findLatestAsOf(fundId));

    if (resolvedAsOf === null) {
      return null;
    }

    const asOfDate = parseFundPriceDate(resolvedAsOf);
    const [holdings, allocations] = await Promise.all([
      this.prisma.fundHolding.findMany({
        where: {
          fundId,
          asOf: asOfDate,
        },
        orderBy: { rank: 'asc' },
      }),
      this.prisma.fundAllocation.findMany({
        where: {
          fundId,
          asOf: asOfDate,
        },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    return {
      asOf: resolvedAsOf,
      holdings: holdings.map((record) =>
        mapPrismaFundHoldingToFundHolding(record),
      ),
      allocations: allocations.map((record) =>
        mapPrismaFundAllocationToFundAllocation(record),
      ),
    };
  }

  /**
   * Reads allocation slices for a fund snapshot and exposure category.
   *
   * @param fundId - Persisted fund identifier.
   * @param category - Exposure allocation category.
   * @param asOf - Optional snapshot date; latest snapshot is used when omitted.
   * @returns Snapshot date and allocations, or `null` when no data exists.
   */
  async findAllocationsByCategory(
    fundId: string,
    category: FundAllocationCategory,
    asOf?: string,
  ): Promise<{ asOf: string; allocations: FundAllocation[] } | null> {
    const resolvedAsOf =
      asOf ?? (await this.findLatestAllocationsAsOf(fundId, category));

    if (resolvedAsOf === null) {
      return null;
    }

    const asOfDate = parseFundPriceDate(resolvedAsOf);
    const allocations = await this.prisma.fundAllocation.findMany({
      where: {
        fundId,
        asOf: asOfDate,
        category: mapFundAllocationCategoryToPrisma(category),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      asOf: resolvedAsOf,
      allocations: allocations.map((record) =>
        mapPrismaFundAllocationToFundAllocation(record),
      ),
    };
  }

  /**
   * Returns the latest persisted allocation snapshot date for a category.
   *
   * @param fundId - Persisted fund identifier.
   * @param category - Exposure allocation category.
   * @returns Latest ISO date string or `null`.
   */
  async findLatestAllocationsAsOf(
    fundId: string,
    category: FundAllocationCategory,
  ): Promise<string | null> {
    const latestAllocation = await this.prisma.fundAllocation.findFirst({
      where: {
        fundId,
        category: mapFundAllocationCategoryToPrisma(category),
      },
      orderBy: { asOf: 'desc' },
      select: { asOf: true },
    });

    return latestAllocation === null
      ? null
      : formatFundPriceDate(latestAllocation.asOf);
  }

  /**
   * Reads holdings for a fund snapshot.
   *
   * @param fundId - Persisted fund identifier.
   * @param asOf - Optional snapshot date; latest holdings snapshot is used when omitted.
   * @returns Snapshot date and holdings, or `null` when no data exists.
   */
  async findHoldings(
    fundId: string,
    asOf?: string,
  ): Promise<{ asOf: string; holdings: FundHolding[] } | null> {
    const resolvedAsOf = asOf ?? (await this.findLatestHoldingsAsOf(fundId));

    if (resolvedAsOf === null) {
      return null;
    }

    const asOfDate = parseFundPriceDate(resolvedAsOf);
    const holdings = await this.prisma.fundHolding.findMany({
      where: {
        fundId,
        asOf: asOfDate,
      },
      orderBy: { rank: 'asc' },
    });

    return {
      asOf: resolvedAsOf,
      holdings: holdings.map((record) =>
        mapPrismaFundHoldingToFundHolding(record),
      ),
    };
  }

  /**
   * Returns the latest persisted holdings snapshot date for a fund, if any.
   *
   * @param fundId - Persisted fund identifier.
   * @returns Latest ISO date string or `null`.
   */
  async findLatestHoldingsAsOf(fundId: string): Promise<string | null> {
    const latestHolding = await this.prisma.fundHolding.findFirst({
      where: { fundId },
      orderBy: { asOf: 'desc' },
      select: { asOf: true },
    });

    return latestHolding === null
      ? null
      : formatFundPriceDate(latestHolding.asOf);
  }

  /**
   * Returns the latest persisted composition date for a fund, if any.
   *
   * @param fundId - Persisted fund identifier.
   * @returns Latest ISO date string or `null`.
   */
  async findLatestAsOf(fundId: string): Promise<string | null> {
    const [latestHolding, latestAllocation] = await Promise.all([
      this.prisma.fundHolding.findFirst({
        where: { fundId },
        orderBy: { asOf: 'desc' },
        select: { asOf: true },
      }),
      this.prisma.fundAllocation.findFirst({
        where: { fundId },
        orderBy: { asOf: 'desc' },
        select: { asOf: true },
      }),
    ]);

    const candidates = [latestHolding?.asOf, latestAllocation?.asOf].filter(
      (value): value is Date => value !== undefined,
    );

    if (candidates.length === 0) {
      return null;
    }

    const latestDate = candidates.reduce((latest, current) =>
      current > latest ? current : latest,
    );

    return formatFundPriceDate(latestDate);
  }
}
