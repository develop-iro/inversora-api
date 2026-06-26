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
  vehicle: 'etf',
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
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
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

  it('should promote quarantined funds when catalog data becomes complete', async () => {
    const completeQuarantinedFund = {
      ...fund,
      catalogVisibility: 'quarantined' as const,
    };

    await service.applyAutomaticVisibilityRules(completeQuarantinedFund);

    expect(repository.updateCatalogVisibility).toHaveBeenCalledWith(
      expect.objectContaining({
        fundId: fund.id,
        catalogVisibility: 'visible',
        actor: 'system',
      }),
    );
  });

  it('should skip automatic updates when visibility already matches', async () => {
    await expect(
      service.applyAutomaticVisibilityRules(fund),
    ).resolves.toMatchObject({ catalogVisibility: 'visible' });

    expect(repository.updateCatalogVisibility).not.toHaveBeenCalled();
  });

  it('should return audit history for an existing fund', async () => {
    repository.findCatalogVisibilityAudits.mockResolvedValueOnce([
      {
        id: 'audit-1',
        fundId: fund.id,
        previousState: 'visible',
        newState: 'quarantined',
        reason: 'Missing score',
        actor: 'system',
        createdAt: new Date('2024-03-01T00:00:00.000Z'),
      },
    ]);

    await expect(service.listVisibilityAudits(fund.id)).resolves.toHaveLength(
      1,
    );
  });

  it('should return the fund unchanged when visibility is already set', async () => {
    await expect(
      service.updateCatalogVisibility({
        fundId: fund.id,
        catalogVisibility: 'visible',
        reason: 'No change needed',
      }),
    ).resolves.toMatchObject({ catalogVisibility: 'visible' });

    expect(repository.updateCatalogVisibility).not.toHaveBeenCalled();
  });

  it('should reject updates and audit lookups for unknown funds', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(
      service.updateCatalogVisibility({
        fundId: fund.id,
        catalogVisibility: 'blocked',
        reason: 'Block unknown fund',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.findById.mockResolvedValueOnce(null);

    await expect(service.listVisibilityAudits(fund.id)).rejects.toBeInstanceOf(
      NotFoundException,
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

  it('should default the audit actor to admin when omitted', async () => {
    await service.updateCatalogVisibility({
      fundId: fund.id,
      catalogVisibility: 'blocked',
      reason: 'Manual block',
    });

    expect(repository.updateCatalogVisibility).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'admin' }),
    );
  });
});
