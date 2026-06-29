import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentNewsController } from './investment-news.controller';
import { InvestmentNewsService } from '../services/investment-news.service';

describe('InvestmentNewsController', () => {
  let controller: InvestmentNewsController;
  let investmentNewsService: { getInvestmentNews: jest.Mock };

  const response = {
    data: [
      {
        id: 'news-ter-basics',
        title: 'Qué es el TER y por qué importa en un fondo indexado',
        summary: 'La comisión anual total reduce el rendimiento neto.',
        source: 'Inversora Educa',
        publishedAt: '2026-06-20',
        category: 'concepto',
      },
    ],
  };

  beforeEach(async () => {
    investmentNewsService = {
      getInvestmentNews: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentNewsController],
      providers: [
        {
          provide: InvestmentNewsService,
          useValue: investmentNewsService,
        },
      ],
    }).compile();

    controller = module.get(InvestmentNewsController);
  });

  it('delegates news requests to the service', () => {
    investmentNewsService.getInvestmentNews.mockReturnValue(response);

    expect(controller.getInvestmentNews({ limit: '1' })).toEqual(response);
    expect(investmentNewsService.getInvestmentNews).toHaveBeenCalledWith({
      limit: '1',
    });
  });
});
