import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import { FundEditorialService } from '../../funds/services/fund-editorial.service';
import { buildFundTestFixture } from '../../funds/test-utils/fund.entity.fixtures';
import { AdminApiKeyGuard } from '../guards/admin-api-key.guard';
import { AdminCatalogEnabledGuard } from '../guards/admin-catalog-enabled.guard';
import { GetAdminFundsUseCase } from '../get-admin-funds';
import { AdminFundsController } from './admin-funds.controller';

const fund = buildFundTestFixture({
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
  currency: 'USD',
  benchmark: 'S&P 500',
  issuer: null,
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
  catalogVisibility: 'visible' as const,
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
});

describe('AdminFundsController', () => {
  let controller: AdminFundsController;
  let getAdminFundsUseCase: { execute: jest.Mock };
  let catalogVisibilityService: {
    updateCatalogVisibility: jest.Mock;
    listVisibilityAudits: jest.Mock;
  };
  let fundEditorialService: { updateEditorial: jest.Mock };

  beforeEach(async () => {
    getAdminFundsUseCase = {
      execute: jest.fn().mockResolvedValue({
        data: [fund],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    };
    catalogVisibilityService = {
      updateCatalogVisibility: jest.fn().mockResolvedValue(fund),
      listVisibilityAudits: jest.fn().mockResolvedValue([]),
    };
    fundEditorialService = {
      updateEditorial: jest.fn().mockResolvedValue(fund),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminFundsController],
      providers: [
        { provide: GetAdminFundsUseCase, useValue: getAdminFundsUseCase },
        {
          provide: CatalogVisibilityService,
          useValue: catalogVisibilityService,
        },
        { provide: FundEditorialService, useValue: fundEditorialService },
      ],
    })
      .overrideGuard(AdminApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminCatalogEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminFundsController);
  });

  it('should list funds for admin queries', async () => {
    const response = await controller.listFunds({ page: '1', limit: '20' });

    expect(response.data).toHaveLength(1);
    expect(getAdminFundsUseCase.execute).toHaveBeenCalled();
  });

  it('should update catalog visibility', async () => {
    await controller.updateCatalogVisibility(fund.id, {
      catalogVisibility: 'quarantined',
      reason: 'Manual review pending',
    });

    expect(
      catalogVisibilityService.updateCatalogVisibility,
    ).toHaveBeenCalledWith({
      fundId: fund.id,
      catalogVisibility: 'quarantined',
      reason: 'Manual review pending',
      actor: undefined,
    });
  });

  it('should return visibility audit history', async () => {
    await expect(
      controller.listCatalogVisibilityAudit(fund.id),
    ).resolves.toEqual({ data: [] });
  });

  it('should update editorial fields', async () => {
    await controller.updateEditorial(fund.id, {
      badge: 'Ideal para empezar',
      themeLabel: 'Multisector global',
      idealForBeginners: true,
    });

    expect(fundEditorialService.updateEditorial).toHaveBeenCalledWith({
      fundId: fund.id,
      editorial: {
        badge: 'Ideal para empezar',
        themeLabel: 'Multisector global',
        idealForBeginners: true,
      },
    });
  });

  it('should reject invalid admin list queries', () => {
    getAdminFundsUseCase.execute.mockImplementation(() => {
      throw new BadRequestException();
    });

    expect(() => controller.listFunds({ page: '0' })).toThrow(
      BadRequestException,
    );
  });
});
