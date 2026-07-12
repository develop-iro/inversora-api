import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { MyInvestorMcpClient } from './myinvestor-mcp.client';
import {
  MYINVESTOR_INDEX_FUND_PRODUCT_TYPE,
  MYINVESTOR_PROVIDER_NAME,
} from './myinvestor.constants';
import type { ProviderMyInvestorFund } from './myinvestor.domain.schemas';
import {
  MYINVESTOR_FIXTURE_FILES,
  MyInvestorFixtureService,
} from './myinvestor.fixture.service';
import { normalizeMyInvestorFunds } from './myinvestor.normalizers';
import {
  myInvestorGetFundsPayloadSchema,
  myInvestorSearchFundsPayloadSchema,
} from './myinvestor.raw.schemas';

/** Options for searching index funds in the MyInvestor catalog. */
export interface SearchMyInvestorIndexFundsOptions {
  /** Maximum number of funds to return (server caps at 10 per call). */
  readonly limit?: number;
}

/**
 * Outbound provider for the public MyInvestor fund catalog (UCITS coverage).
 *
 * Complements Financial Modeling Prep with data unavailable on the current
 * FMP plan: index mutual funds sold in Spain, TER, SRRI, tracking error, and
 * volatility. Read-only by design; it never touches accounts or executes
 * transactions.
 */
@Injectable()
export class MyInvestorProvider {
  constructor(
    private readonly config: AppConfigService,
    private readonly client: MyInvestorMcpClient,
    private readonly fixtures: MyInvestorFixtureService,
  ) {}

  /**
   * Retrieves normalized fund snapshots for one or more exact ISINs.
   *
   * @param isins - Fund ISINs to resolve.
   * @returns Normalized fund snapshots; unknown ISINs are omitted.
   */
  async getFundsByIsin(
    isins: readonly string[],
  ): Promise<ProviderMyInvestorFund[]> {
    const normalizedIsins = isins
      .map((isin) => isin.trim().toUpperCase())
      .filter((isin) => isin.length > 0);

    if (normalizedIsins.length === 0) {
      return [];
    }

    const payload = this.config.myInvestorUsesMocks
      ? await this.readFixturePayload(
          MYINVESTOR_FIXTURE_FILES.getFunds,
          myInvestorGetFundsPayloadSchema,
          'get_funds',
        )
      : this.parsePayload(
          await this.client.callTool('get_funds', { isins: normalizedIsins }),
          myInvestorGetFundsPayloadSchema,
          'get_funds',
        );

    const funds = normalizeMyInvestorFunds(payload.data.funds);

    return funds.filter((fund) => normalizedIsins.includes(fund.isin));
  }

  /**
   * Searches index mutual funds in the MyInvestor catalog.
   *
   * @param options - Optional result limit.
   * @returns Normalized index fund snapshots.
   */
  async searchIndexFunds(
    options?: SearchMyInvestorIndexFundsOptions,
  ): Promise<ProviderMyInvestorFund[]> {
    const payload = this.config.myInvestorUsesMocks
      ? await this.readFixturePayload(
          MYINVESTOR_FIXTURE_FILES.searchIndexFunds,
          myInvestorSearchFundsPayloadSchema,
          'search_funds',
        )
      : this.parsePayload(
          await this.client.callTool('search_funds', {
            product_type: MYINVESTOR_INDEX_FUND_PRODUCT_TYPE,
            ...(options?.limit !== undefined ? { limit: options.limit } : {}),
          }),
          myInvestorSearchFundsPayloadSchema,
          'search_funds',
        );

    const funds = normalizeMyInvestorFunds(payload.data.funds);

    if (options?.limit === undefined) {
      return funds;
    }

    return funds.slice(0, options.limit);
  }

  private async readFixturePayload<TSchema extends z.ZodTypeAny>(
    fileName: string,
    schema: TSchema,
    tool: string,
  ): Promise<z.infer<TSchema>> {
    const fixture = await this.fixtures.readFixture(fileName);

    return this.parsePayload(fixture, schema, tool);
  }

  private parsePayload<TSchema extends z.ZodTypeAny>(
    data: unknown,
    schema: TSchema,
    tool: string,
  ): z.infer<TSchema> {
    const parsed = schema.safeParse(data);

    if (!parsed.success) {
      throw new ExternalHttpError({
        message: `Invalid structured payload from MyInvestor MCP ${tool}`,
        provider: MYINVESTOR_PROVIDER_NAME,
        cause: parsed.error,
      });
    }

    return parsed.data;
  }
}
