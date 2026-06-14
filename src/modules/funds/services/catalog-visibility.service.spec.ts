import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Fund } from '../entities/fund.schema';
import { FundsRepository } from '../repositories/funds.repository';
import { CatalogVisibilityService } from './catalog-visibility.service';

const fund: Fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
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
  catalogVisibility: 'visible',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('CatalogVisibilityService', () => {
  let service: CatalogVisibilityService;
  let repository: {
    findById: jest.Mock;
    updateCatalogVisibility: jest.Mock;
    findCatalogVisibilityAudits: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findById: jest.fn().mockResolvedValue(fund),
      updateCatalogVisibility: jest
        .fn()
        .mockImplementation(
          (input: { catalogVisibility: Fund['catalogVisibility'] }) =>
            Promise.resolve({
              ...fund,
              catalogVisibility: input.catalogVisibility,
            }),
        ),
      findCatalogVisibilityAudits: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogVisibilityService,
        { provide: FundsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(CatalogVisibilityService);
  });

  it('should hide non-visible funds from public endpoints', () => {
    expect(() =>
      service.assertPublicCatalogVisible({
        ...fund,
        catalogVisibility: 'quarantined',
      }),
    ).toThrow(NotFoundException);
  });

  it('should quarantine visible funds with incomplete data after sync', async () => {
    const incompleteFund = { ...fund, score: null };

    await service.applyAutomaticVisibilityRules(incompleteFund);

    expect(repository.updateCatalogVisibility).toHaveBeenCalledWith(
      expect.objectContaining({
        fundId: fund.id,
        catalogVisibility: 'quarantined',
        actor: 'system',
      }),
    );
  });

  it('should update catalog visibility through the admin workflow', async () => {
    await service.updateCatalogVisibility({
      fundId: fund.id,
      catalogVisibility: 'blocked',
      reason: 'Manual block: non-index product',
      actor: 'ops@inversora.dev',
    });

    expect(repository.updateCatalogVisibility).toHaveBeenCalledWith({
      fundId: fund.id,
      catalogVisibility: 'blocked',
      reason: 'Manual block: non-index product',
      actor: 'ops@inversora.dev',
    });
  });
});
