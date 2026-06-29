import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import type { Fund } from '../../funds/entities/fund.schema';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import * as featuredFundsMapper from '../entities/featured-funds.mapper';
import { FeaturedFundsService } from './featured-funds.service';

const fund: Fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  issuer: 'State Street',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
  currency: 'USD',
  benchmark: 'S&P 500',
  metrics: {
    volatility: 14.2,
    drawdown: 8.5,
    ter: 0.0945,
    aum: 520_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: 0.03,
  },
  riskLevel: 4,
  score: 82,
  catalogVisibility: 'visible',
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('FeaturedFundsService', () => {
  let service: FeaturedFundsService;
  let fundsRepository: { findByIsins: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findByIsins: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturedFundsService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: AppConfigService,
          useValue: { brandfetchClientId: undefined },
        },
      ],
    }).compile();

    service = module.get(FeaturedFundsService);
  });

  it('should return an empty array for unconfigured quarters', async () => {
    const response = await service.getFeaturedFunds({ quarter: '1999-Q1' });

    expect(response.data).toEqual([]);
    expect(response.quarter).toBe('1999-Q1');
    expect(fundsRepository.findByIsins).not.toHaveBeenCalled();
  });

  it('should hydrate configured quarter selections from PostgreSQL', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([[fund.isin as string, fund]]),
    );

    const response = await service.getFeaturedFunds({ quarter: '2026-Q2' });

    expect(response.quarter).toBe('2026-Q2');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data[0]?.isin).toBe('US78462F1030');
    expect(response.data[0]?.isFeatured).toBe(true);
  });

  it('should skip curated ISINs that are not synced yet', async () => {
    fundsRepository.findByIsins.mockResolvedValue(new Map());

    const response = await service.getFeaturedFunds({ quarter: '2026-Q2' });

    expect(response.data).toEqual([]);
  });

  it('should reject invalid quarter formats', async () => {
    await expect(
      service.getFeaturedFunds({ quarter: 'invalid' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject invalid limit values', async () => {
    await expect(
      service.getFeaturedFunds({ quarter: '2026-Q2', limit: '0' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return cached responses for repeated requests', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([[fund.isin as string, fund]]),
    );

    await service.getFeaturedFunds({ quarter: '2026-Q2' });
    await service.getFeaturedFunds({ quarter: '2026-Q2' });

    expect(fundsRepository.findByIsins).toHaveBeenCalledTimes(1);
  });

  it('should skip hydrated funds without a persisted ISIN', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        [
          'US78462F1030',
          {
            ...fund,
            isin: null,
          },
        ],
      ]),
    );

    const response = await service.getFeaturedFunds({ quarter: '2026-Q2' });

    expect(response.data).toEqual([]);
  });

  it('should skip non-visible catalog funds', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        [
          'US78462F1030',
          {
            ...fund,
            catalogVisibility: 'quarantined' as const,
          },
        ],
      ]),
    );

    const response = await service.getFeaturedFunds({ quarter: '2026-Q2' });

    expect(response.data).toEqual([]);
  });

  it('should propagate unexpected quarter parsing failures', async () => {
    const parseSpy = jest
      .spyOn(featuredFundsMapper, 'parseFeaturedQuarterQuery')
      .mockImplementationOnce(() => {
        throw new Error('unexpected parser failure');
      });

    await expect(
      service.getFeaturedFunds({ quarter: '2026-Q2' }),
    ).rejects.toThrow('unexpected parser failure');

    parseSpy.mockRestore();
  });
});
