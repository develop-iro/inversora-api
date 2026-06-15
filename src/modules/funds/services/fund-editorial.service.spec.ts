import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../repositories/funds.repository';
import { FundEditorialService } from './fund-editorial.service';

const fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep' as const,
  category: 'index' as const,
  currency: 'USD',
  benchmark: 'S&P 500',
  metrics: {
    volatility: null,
    drawdown: null,
    ter: 0.0945,
    aum: 520_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: null,
  },
  riskLevel: 4,
  score: 82.5,
  editorial: {
    badge: 'Núcleo USA',
    themeLabel: 'Referencia S&P 500',
    idealForBeginners: true,
  },
  catalogVisibility: 'visible' as const,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('FundEditorialService', () => {
  let service: FundEditorialService;
  let fundsRepository: {
    findById: jest.Mock;
    updateEditorial: jest.Mock;
  };

  beforeEach(async () => {
    fundsRepository = {
      findById: jest.fn().mockResolvedValue(fund),
      updateEditorial: jest.fn().mockResolvedValue(fund),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundEditorialService,
        { provide: FundsRepository, useValue: fundsRepository },
      ],
    }).compile();

    service = module.get(FundEditorialService);
  });

  it('should update editorial fields when the fund exists', async () => {
    await expect(
      service.updateEditorial({
        fundId: fund.id,
        editorial: { badge: 'Ideal para empezar' },
      }),
    ).resolves.toEqual(fund);

    expect(fundsRepository.updateEditorial).toHaveBeenCalledWith(fund.id, {
      badge: 'Ideal para empezar',
    });
  });

  it('should reject empty editorial payloads', async () => {
    await expect(
      service.updateEditorial({
        fundId: fund.id,
        editorial: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject updates for missing funds', async () => {
    fundsRepository.findById.mockResolvedValueOnce(null);

    await expect(
      service.updateEditorial({
        fundId: fund.id,
        editorial: { badge: 'Test' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
