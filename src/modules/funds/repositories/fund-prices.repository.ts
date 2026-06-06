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
}
