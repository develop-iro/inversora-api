import { BadRequestException } from '@nestjs/common';
import { InvestmentNewsService } from './investment-news.service';

describe('InvestmentNewsService', () => {
  let service: InvestmentNewsService;

  beforeEach(() => {
    service = new InvestmentNewsService();
  });

  it('returns curated news with default limit', () => {
    const response = service.getInvestmentNews({});

    expect(response.data).toHaveLength(4);
    expect(response.data[0]?.id).toBe('news-ter-basics');
  });

  it('respects the requested limit', () => {
    const response = service.getInvestmentNews({ limit: '2' });

    expect(response.data).toHaveLength(2);
  });

  it('throws BadRequestException for invalid limit', () => {
    expect(() => service.getInvestmentNews({ limit: '0' })).toThrow(
      BadRequestException,
    );
  });
});
