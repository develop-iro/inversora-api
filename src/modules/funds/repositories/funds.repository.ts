import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  mapDomainFundProviderToPrisma,
  mapPrismaFundToFund,
  mapUpsertFundInputToPrismaCreateData,
  mapUpsertFundInputToPrismaUpdateData,
} from '../entities/fund.mapper';
import { upsertFundInputSchema } from '../entities/fund.schema';
import type {
  Fund,
  FundProvider,
  UpsertFundInput,
} from '../entities/fund.schema';

/** Options for paginated fund list queries. */
export interface FindManyFundsOptions {
  where: Prisma.FundWhereInput;
  orderBy: Prisma.FundOrderByWithRelationInput;
  skip: number;
  take: number;
}

/**
 * Persistence layer for fund domain records.
 */
@Injectable()
export class FundsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a paginated fund list matching the provided query options.
   *
   * @param options - Filter, sort, and pagination options.
   * @returns Matching funds and total row count.
   */
  async findMany(
    options: FindManyFundsOptions,
  ): Promise<{ items: Fund[]; total: number }> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.fund.findMany({
        where: options.where,
        orderBy: options.orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.fund.count({ where: options.where }),
    ]);

    return {
      items: records.map((record) => mapPrismaFundToFund(record)),
      total,
    };
  }

  /**
   * Returns all persisted funds ordered by symbol ascending.
   *
   * @returns Persisted fund entities.
   */
  async findAll(): Promise<Fund[]> {
    const records = await this.prisma.fund.findMany({
      orderBy: { symbol: 'asc' },
    });

    return records.map((record) => mapPrismaFundToFund(record));
  }

  /**
   * Finds a persisted fund by symbol and provider.
   *
   * @param symbol - Fund ticker symbol.
   * @param provider - External data provider.
   * @returns Persisted fund or `null`.
   */
  async findBySymbolAndProvider(
    symbol: string,
    provider: FundProvider,
  ): Promise<Fund | null> {
    const record = await this.prisma.fund.findUnique({
      where: {
        symbol_provider: {
          symbol: symbol.trim().toUpperCase(),
          provider: mapDomainFundProviderToPrisma(provider),
        },
      },
    });

    return record === null ? null : mapPrismaFundToFund(record);
  }

  /**
   * Finds a persisted fund by ISIN.
   *
   * @param isin - ISO 6166 ISIN in uppercase format.
   * @returns Persisted fund or `null`.
   */
  async findByIsin(isin: string): Promise<Fund | null> {
    const record = await this.prisma.fund.findUnique({
      where: {
        isin: isin.trim().toUpperCase(),
      },
    });

    return record === null ? null : mapPrismaFundToFund(record);
  }

  /**
   * Finds a persisted fund by primary key.
   *
   * @param id - Fund identifier.
   * @returns Persisted fund or `null`.
   */
  async findById(id: string): Promise<Fund | null> {
    const record = await this.prisma.fund.findUnique({
      where: { id },
    });

    return record === null ? null : mapPrismaFundToFund(record);
  }

  /**
   * Creates or updates a fund keyed by symbol and provider.
   *
   * @param input - Validated upsert input.
   * @returns Persisted fund and whether a new row was created.
   */
  async upsert(
    input: UpsertFundInput,
  ): Promise<{ fund: Fund; created: boolean }> {
    const validatedInput = upsertFundInputSchema.parse(input);
    const normalizedSymbol = validatedInput.symbol.trim().toUpperCase();
    const existing = await this.findBySymbolAndProvider(
      normalizedSymbol,
      validatedInput.provider,
    );
    const record = await this.prisma.fund.upsert({
      where: {
        symbol_provider: {
          symbol: normalizedSymbol,
          provider: mapDomainFundProviderToPrisma(validatedInput.provider),
        },
      },
      create: mapUpsertFundInputToPrismaCreateData(validatedInput),
      update: mapUpsertFundInputToPrismaUpdateData(validatedInput),
    });

    return {
      fund: mapPrismaFundToFund(record),
      created: existing === null,
    };
  }

  /**
   * Persists the computed Invesora Score for a fund.
   *
   * @param id - Fund identifier.
   * @param score - Score between 0 and 100.
   * @returns Updated fund entity.
   */
  async updateScore(id: string, score: number): Promise<Fund> {
    const record = await this.prisma.fund.update({
      where: { id },
      data: { score },
    });

    return mapPrismaFundToFund(record);
  }
}
