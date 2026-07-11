import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  mapDomainFundProviderToPrisma,
  mapDomainCatalogVisibilityToPrisma,
  mapDomainInvestmentThemeToPrisma,
  mapPrismaCatalogVisibility,
  mapPrismaFundToFund,
  mapUpdateFundEditorialInputToPrismaData,
  mapUpsertFundInputToPrismaCreateData,
  mapUpsertFundInputToPrismaUpdateData,
} from '../entities/fund.mapper';
import { resolveFundThemeSyncFields } from '../entities/fund-theme.sync';
import { upsertFundInputSchema } from '../entities/fund.schema';
import type {
  Fund,
  FundProvider,
  InvestmentTheme,
  UpsertFundInput,
} from '../entities/fund.schema';
import type { UpdateFundEditorialInput } from '../entities/fund-editorial.schema';
import type { CatalogVisibility } from '../entities/catalog-visibility.schema';

/** Options for paginated fund list queries. */
export interface FindManyFundsOptions {
  where: Prisma.FundWhereInput;
  orderBy: Prisma.FundOrderByWithRelationInput;
  skip: number;
  take: number;
}

/** Input for updating catalog visibility with audit logging. */
export interface UpdateCatalogVisibilityRepositoryInput {
  fundId: string;
  catalogVisibility: CatalogVisibility;
  reason: string;
  actor: string;
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
   * Returns funds eligible for public benchmark rankings (RN-02).
   *
   * Filters at the database layer to avoid loading blocked funds into memory.
   *
   * @returns Persisted funds with benchmark, ISIN, score, and TER populated.
   */
  async findRankingEligible(): Promise<Fund[]> {
    const records = await this.prisma.fund.findMany({
      where: {
        catalogVisibility: {
          not: mapDomainCatalogVisibilityToPrisma('blocked'),
        },
        benchmark: { not: null },
        isin: { not: null },
        score: { not: null },
        ter: { not: null },
      },
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
   * Finds persisted funds for a list of ISINs.
   *
   * @param isins - ISO 6166 ISIN codes in any casing.
   * @returns Map keyed by normalized uppercase ISIN.
   */
  async findByIsins(isins: readonly string[]): Promise<Map<string, Fund>> {
    if (isins.length === 0) {
      return new Map();
    }

    const normalizedIsins = [
      ...new Set(isins.map((isin) => isin.trim().toUpperCase())),
    ];
    const records = await this.prisma.fund.findMany({
      where: {
        isin: {
          in: normalizedIsins,
        },
      },
    });

    return new Map(
      records
        .filter((record) => record.isin !== null)
        .map((record) => {
          const fund = mapPrismaFundToFund(record);
          return [record.isin as string, fund] as const;
        }),
    );
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
    const {
      themeClassificationDescription,
      investmentTheme,
      ...persistedInput
    } = validatedInput;
    void investmentTheme;
    const normalizedSymbol = persistedInput.symbol.trim().toUpperCase();
    const existing = await this.findBySymbolAndProvider(
      normalizedSymbol,
      persistedInput.provider,
    );
    const themeFields = resolveFundThemeSyncFields(
      {
        name: persistedInput.name,
        benchmark: persistedInput.benchmark,
        assetClass: persistedInput.assetClass,
        description: themeClassificationDescription,
      },
      existing?.editorial.themeLabel,
    );
    const record = await this.prisma.fund.upsert({
      where: {
        symbol_provider: {
          symbol: normalizedSymbol,
          provider: mapDomainFundProviderToPrisma(persistedInput.provider),
        },
      },
      create: {
        ...mapUpsertFundInputToPrismaCreateData(persistedInput),
        investmentTheme: mapDomainInvestmentThemeToPrisma(
          themeFields.investmentTheme,
        ),
        themeLabel: themeFields.themeLabel,
      },
      update: {
        ...mapUpsertFundInputToPrismaUpdateData(persistedInput),
        investmentTheme: mapDomainInvestmentThemeToPrisma(
          themeFields.investmentTheme,
        ),
        ...(existing?.editorial.themeLabel.trim() === ''
          ? { themeLabel: themeFields.themeLabel }
          : {}),
      },
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

  /**
   * Persists an inferred investment theme and optional editorial label.
   *
   * @param id - Fund identifier.
   * @param input - Theme classification payload.
   */
  async applyInvestmentTheme(
    id: string,
    input: {
      investmentTheme: InvestmentTheme;
      themeLabel?: string;
    },
  ): Promise<Fund> {
    const record = await this.prisma.fund.update({
      where: { id },
      data: {
        investmentTheme: mapDomainInvestmentThemeToPrisma(
          input.investmentTheme,
        ),
        ...(input.themeLabel !== undefined
          ? { themeLabel: input.themeLabel }
          : {}),
      },
    });

    return mapPrismaFundToFund(record);
  }

  /**
   * Updates catalog visibility and appends an audit row in a single transaction.
   *
   * @param input - Visibility change payload.
   * @returns Updated fund entity.
   */
  async updateCatalogVisibility(
    input: UpdateCatalogVisibilityRepositoryInput,
  ): Promise<Fund> {
    const record = await this.prisma.$transaction(async (tx) => {
      const current = await tx.fund.findUnique({
        where: { id: input.fundId },
      });

      if (current === null) {
        throw new Error(`Fund ${input.fundId} was not found`);
      }

      const updated = await tx.fund.update({
        where: { id: input.fundId },
        data: {
          catalogVisibility: mapDomainCatalogVisibilityToPrisma(
            input.catalogVisibility,
          ),
        },
      });

      await tx.fundCatalogVisibilityAudit.create({
        data: {
          fundId: input.fundId,
          previousState: current.catalogVisibility,
          newState: updated.catalogVisibility,
          reason: input.reason,
          actor: input.actor,
        },
      });

      return updated;
    });

    return mapPrismaFundToFund(record);
  }

  /**
   * Updates editorial product fields for a fund.
   *
   * FMP sync does not overwrite these columns; only admin API updates them.
   *
   * @param fundId - Persisted fund identifier.
   * @param input - Partial editorial fields to persist.
   * @returns Updated fund entity.
   */
  async updateEditorial(
    fundId: string,
    input: UpdateFundEditorialInput,
  ): Promise<Fund> {
    const record = await this.prisma.fund.update({
      where: { id: fundId },
      data: mapUpdateFundEditorialInputToPrismaData(input),
    });

    return mapPrismaFundToFund(record);
  }

  /**
   * Returns fund counts grouped by catalog visibility state.
   *
   * @returns Counts for visible, quarantined, and blocked funds.
   */
  async countByCatalogVisibility(): Promise<{
    visible: number;
    quarantined: number;
    blocked: number;
  }> {
    const groups = await this.prisma.fund.groupBy({
      by: ['catalogVisibility'],
      _count: { _all: true },
    });

    const counts = {
      visible: 0,
      quarantined: 0,
      blocked: 0,
    };

    for (const group of groups) {
      const key = mapPrismaCatalogVisibility(group.catalogVisibility);

      counts[key] = group._count._all;
    }

    return counts;
  }

  /**
   * Returns catalog visibility audit rows for a fund ordered by newest first.
   *
   * @param fundId - Persisted fund identifier.
   */
  async findCatalogVisibilityAudits(fundId: string): Promise<
    {
      id: string;
      fundId: string;
      previousState: CatalogVisibility;
      newState: CatalogVisibility;
      reason: string;
      actor: string;
      createdAt: Date;
    }[]
  > {
    const records = await this.prisma.fundCatalogVisibilityAudit.findMany({
      where: { fundId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      id: record.id,
      fundId: record.fundId,
      previousState: mapPrismaCatalogVisibility(record.previousState),
      newState: mapPrismaCatalogVisibility(record.newState),
      reason: record.reason,
      actor: record.actor,
      createdAt: record.createdAt,
    }));
  }
}
