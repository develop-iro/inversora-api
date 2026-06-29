import { BadRequestException, Injectable } from '@nestjs/common';
import { CURATED_INVESTMENT_NEWS } from '../config/investment-news.config';
import {
  investmentNewsQuerySchema,
  type InvestmentNewsQuery,
  type InvestmentNewsResponse,
} from '../entities/investment-news.schema';

const DEFAULT_NEWS_LIMIT = 4;

/**
 * Serves curated educational investment news for the mobile home feed.
 */
@Injectable()
export class InvestmentNewsService {
  /**
   * Returns curated educational headlines for the home news carousel.
   *
   * @param rawQuery - Unvalidated query parameters from the HTTP request.
   */
  getInvestmentNews(rawQuery: Record<string, unknown>): InvestmentNewsResponse {
    const parsed = investmentNewsQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException('Invalid news query parameters.');
    }

    const limit = parsed.data.limit ?? DEFAULT_NEWS_LIMIT;

    return {
      data: [...CURATED_INVESTMENT_NEWS].slice(0, limit),
    };
  }

  /**
   * Typed helper for tests and internal callers.
   *
   * @param query - Parsed news query.
   */
  getNewsForQuery(query: InvestmentNewsQuery): InvestmentNewsResponse {
    return this.getInvestmentNews(query);
  }
}
