import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ProviderNewsArticle } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { CURATED_INVESTMENT_NEWS } from '../config/investment-news.config';
import {
  investmentNewsQuerySchema,
  type InvestmentNewsItem,
  type InvestmentNewsQuery,
  type InvestmentNewsResponse,
} from '../entities/investment-news.schema';

const DEFAULT_NEWS_LIMIT = 4;
const MAX_NEWS_LIMIT = 20;
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;
const NEWS_FAILURE_CACHE_TTL_MS = 60 * 1000;
const MARKET_NEWS_CATEGORY = 'mercado';

type NewsCacheEntry = {
  expiresAt: number;
  items: readonly InvestmentNewsItem[];
};

/**
 * Serves investment news for the mobile home feed.
 *
 * Live market headlines come from Financial Modeling Prep. The curated
 * editorial set acts as a fallback when the provider fails or returns no
 * usable articles.
 */
@Injectable()
export class InvestmentNewsService {
  private readonly logger = new Logger(InvestmentNewsService.name);
  private cache: NewsCacheEntry | null = null;

  constructor(private readonly fmpProvider: FinancialModelingPrepProvider) {}

  /**
   * Returns market headlines (or the curated fallback) for the home carousel.
   *
   * @param rawQuery - Unvalidated query parameters from the HTTP request.
   */
  async getInvestmentNews(
    rawQuery: Record<string, unknown>,
  ): Promise<InvestmentNewsResponse> {
    const parsed = investmentNewsQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException('Invalid news query parameters.');
    }

    const limit = parsed.data.limit ?? DEFAULT_NEWS_LIMIT;
    const marketNews = await this.loadMarketNews();

    if (marketNews.length === 0) {
      return {
        data: [...CURATED_INVESTMENT_NEWS].slice(0, limit),
      };
    }

    return {
      data: marketNews.slice(0, limit),
    };
  }

  /**
   * Typed helper for tests and internal callers.
   *
   * @param query - Parsed news query.
   */
  async getNewsForQuery(
    query: InvestmentNewsQuery,
  ): Promise<InvestmentNewsResponse> {
    return this.getInvestmentNews(query);
  }

  private async loadMarketNews(): Promise<readonly InvestmentNewsItem[]> {
    if (this.cache !== null && this.cache.expiresAt > Date.now()) {
      return this.cache.items;
    }

    try {
      const articles = await this.fmpProvider.getGeneralNews(MAX_NEWS_LIMIT);
      const items = articles.map((article) => this.toNewsItem(article));

      this.cache = {
        expiresAt: Date.now() + NEWS_CACHE_TTL_MS,
        items,
      };

      return items;
    } catch (error) {
      this.logger.warn(
        `Market news unavailable, serving curated fallback: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );

      this.cache = {
        expiresAt: Date.now() + NEWS_FAILURE_CACHE_TTL_MS,
        items: [],
      };

      return [];
    }
  }

  private toNewsItem(article: ProviderNewsArticle): InvestmentNewsItem {
    const urlHash = createHash('sha1')
      .update(article.url)
      .digest('hex')
      .slice(0, 12);

    return {
      id: `fmp-${urlHash}`,
      title: article.title,
      summary: article.summary,
      source: article.source,
      publishedAt: article.publishedAt,
      category: MARKET_NEWS_CATEGORY,
      url: article.url,
    };
  }
}
