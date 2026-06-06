import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  formatFundPriceDate,
  parseFundPriceDate,
} from '../entities/fund-price.mapper';
import {
  mapPrismaFundAllocationToFundAllocation,
  mapPrismaFundHoldingToFundHolding,
  mapUpsertFundAllocationInputToPrismaData,
  mapUpsertFundHoldingInputToPrismaData,
} from '../entities/fund-composition.mapper';
import type {
  FundComposition,
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
