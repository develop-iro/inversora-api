import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  formatFundPriceDate,
  mapPrismaFundPriceToFundPrice,
  mapUpsertFundPriceInputToPrismaData,
  parseFundPriceDate,
} from '../entities/fund-price.mapper';
import type {
  FundPrice,
  FundPriceHistoryQuery,
  UpsertFundPriceInput,
} from '../entities/fund-price.schema';

const UPSERT_CHUNK_SIZE = 100;

/**
 * Persistence layer for fund end-of-day price history.
 */
@Injectable()
export class FundPricesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts a batch of end-of-day price rows for a fund.
   *
   * @param fundId - Persisted fund identifier.
   * @param prices - Price rows to create or update.
   * @returns Number of rows processed.
   */
  async upsertMany(
    fundId: string,
    prices: readonly UpsertFundPriceInput[],
  ): Promise<number> {
    if (prices.length === 0) {
      return 0;
    }

    let processed = 0;

    for (let index = 0; index < prices.length; index += UPSERT_CHUNK_SIZE) {
      const chunk = prices.slice(index, index + UPSERT_CHUNK_SIZE);

      await this.prisma.$transaction(
        chunk.map((price) => {
          const data = mapUpsertFundPriceInputToPrismaData(fundId, price);

          return this.prisma.fundPrice.upsert({
            where: {
              fundId_date: {
                fundId,
                date: data.date,
              },
            },
            create: data,
            update: {
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
              volume: data.volume,
              change: data.change,
              changePercent: data.changePercent,
              vwap: data.vwap,
            },
          });
        }),
      );

      processed += chunk.length;
    }

    return processed;
  }

  /**
   * Reads persisted price history for a fund ordered by date ascending.
   *
   * @param fundId - Persisted fund identifier.
   * @param query - Optional date range filters.
   * @returns Persisted price rows suitable for chart rendering.
   */
  async findHistory(
    fundId: string,
    query: FundPriceHistoryQuery = {},
  ): Promise<FundPrice[]> {
    const where: Prisma.FundPriceWhereInput = {
      fundId,
      ...(query.from !== undefined || query.to !== undefined
        ? {
            date: {
              ...(query.from !== undefined
                ? { gte: parseFundPriceDate(query.from) }
                : {}),
              ...(query.to !== undefined
                ? { lte: parseFundPriceDate(query.to) }
                : {}),
            },
          }
        : {}),
    };

    const records = await this.prisma.fundPrice.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return records.map((record) => mapPrismaFundPriceToFundPrice(record));
  }

  /**
   * Returns the latest persisted price date for a fund, if any.
   *
   * @param fundId - Persisted fund identifier.
   * @returns Latest ISO date string or `null`.
   */
  async findLatestDate(fundId: string): Promise<string | null> {
    const record = await this.prisma.fundPrice.findFirst({
      where: { fundId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    return record === null ? null : formatFundPriceDate(record.date);
  }

  /**
   * Deletes persisted prices older than the given exclusive ISO cutoff.
   *
   * @param fundId - Persisted fund identifier.
   * @param cutoffIsoDate - Rows strictly before this ISO date are removed.
   * @returns Number of deleted rows.
   */
  async deleteOlderThan(
    fundId: string,
    cutoffIsoDate: string,
  ): Promise<number> {
    const result = await this.prisma.fundPrice.deleteMany({
      where: {
        fundId,
        date: {
          lt: parseFundPriceDate(cutoffIsoDate),
        },
      },
    });

    return result.count;
  }

  /**
   * Reads price history for multiple funds in a single query, grouped by fund id.
   *
   * @param fundIds - Persisted fund identifiers.
   * @param query - Optional date range filters applied to every fund.
   * @returns Map of fund id to ascending price rows.
   */
  async findHistoriesByFundIds(
    fundIds: readonly string[],
    query: FundPriceHistoryQuery = {},
  ): Promise<Map<string, FundPrice[]>> {
    if (fundIds.length === 0) {
      return new Map();
    }

    const where: Prisma.FundPriceWhereInput = {
      fundId: { in: [...fundIds] },
      ...(query.from !== undefined || query.to !== undefined
        ? {
            date: {
              ...(query.from !== undefined
                ? { gte: parseFundPriceDate(query.from) }
                : {}),
              ...(query.to !== undefined
                ? { lte: parseFundPriceDate(query.to) }
                : {}),
            },
          }
        : {}),
    };

    const records = await this.prisma.fundPrice.findMany({
      where,
      orderBy: [{ fundId: 'asc' }, { date: 'asc' }],
    });

    const grouped = new Map<string, FundPrice[]>();

    for (const record of records) {
      const prices = grouped.get(record.fundId) ?? [];
      prices.push(mapPrismaFundPriceToFundPrice(record));
      grouped.set(record.fundId, prices);
    }

    return grouped;
  }
}
