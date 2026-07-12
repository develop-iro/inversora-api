import { BadRequestException } from '@nestjs/common';
import type { ProviderNewsArticle } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import type { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { InvestmentNewsService } from './investment-news.service';

describe('InvestmentNewsService', () => {
  let service: InvestmentNewsService;
  let fmpProvider: { getGeneralNews: jest.Mock };

  const marketArticles: ProviderNewsArticle[] = [
    {
      title: 'Markets await inflation data',
      summary: 'CPI report lands this week alongside bank earnings.',
      source: 'Investopedia',
      publishedAt: '2026-07-12',
      url: 'https://example.com/markets-inflation',
    },
    {
      title: 'S&P 500 nears all-time high',
      summary: 'Big tech rebound pushed the index close to its record.',
      source: 'Invezz',
      publishedAt: '2026-07-11',
      url: 'https://example.com/sp500-high',
    },
  ];

  beforeEach(() => {
    fmpProvider = {
      getGeneralNews: jest.fn().mockResolvedValue(marketArticles),
    };
    service = new InvestmentNewsService(
      fmpProvider as unknown as FinancialModelingPrepProvider,
    );
  });

  it('returns market news mapped to the news contract', async () => {
    const response = await service.getInvestmentNews({});

    expect(response.data).toHaveLength(2);
    expect(response.data[0]).toMatchObject({
      title: 'Markets await inflation data',
      source: 'Investopedia',
      publishedAt: '2026-07-12',
      category: 'mercado',
      url: 'https://example.com/markets-inflation',
    });
    expect(response.data[0]?.id).toMatch(/^fmp-[0-9a-f]{12}$/);
  });

  it('respects the requested limit', async () => {
    const response = await service.getInvestmentNews({ limit: '1' });

    expect(response.data).toHaveLength(1);
  });

  it('caches provider news between requests', async () => {
    await service.getInvestmentNews({});
    await service.getInvestmentNews({});

    expect(fmpProvider.getGeneralNews).toHaveBeenCalledTimes(1);
  });

  it('falls back to curated news when the provider fails', async () => {
    fmpProvider.getGeneralNews.mockRejectedValue(new Error('quota exceeded'));

    const response = await service.getInvestmentNews({});

    expect(response.data).toHaveLength(4);
    expect(response.data[0]?.id).toBe('news-ter-basics');
  });

  it('falls back to curated news when the provider returns no articles', async () => {
    fmpProvider.getGeneralNews.mockResolvedValue([]);

    const response = await service.getInvestmentNews({});

    expect(response.data).toHaveLength(4);
    expect(response.data[0]?.id).toBe('news-ter-basics');
  });

  it('throws BadRequestException for invalid limit', async () => {
    await expect(service.getInvestmentNews({ limit: '0' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
