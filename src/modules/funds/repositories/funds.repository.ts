import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  mapDomainFundProviderToPrisma,
  mapPrismaFundToFund,
  mapUpsertFundInputToPrismaCreateData,
  mapUpsertFundInputToPrismaUpdateData,
} from '../entities/fund.mapper';
import { upsertFundInputSchema } from '../entities/fund.schema';
import type { Fund, FundProvider, UpsertFundInput } from '../entities/fund.schema';

/**
 * Persistence layer for fund domain records.
 */
@Injectable()
export class FundsRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
