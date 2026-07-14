import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetFundCatalogMetricsUseCase } from './get-fund-catalog-metrics';
import { FundsRepository } from './repositories/funds.repository';

describe('GetFundCatalogMetricsUseCase', () => {
  let useCase: GetFundCatalogMetricsUseCase;
  let repository: {
    countMany: jest.Mock;
    getCatalogCategoryMetrics: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      countMany: jest.fn().mockResolvedValue(2),
      getCatalogCategoryMetrics: jest.fn().mockResolvedValue([
        {
          id: 'global-equity',
          fundCount: 2,
          topScore: 91,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFundCatalogMetricsUseCase,
        {
          provide: FundsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    useCase = module.get(GetFundCatalogMetricsUseCase);
  });

  it('should return lightweight catalog totals and category metrics', async () => {
    repository.countMany.mockImplementation((where: unknown) => {
      expect(JSON.stringify(where)).toContain('"riskLevel":{"gte":1,"lte":2}');

      return Promise.resolve(2);
    });
    repository.getCatalogCategoryMetrics.mockImplementation(
      (where: unknown) => {
        expect(JSON.stringify(where)).toContain(
          '"riskLevel":{"gte":1,"lte":2}',
        );

        return Promise.resolve([
          {
            id: 'us-equity',
            fundCount: 1,
            topScore: 88,
          },
          {
            id: 'global-equity',
            fundCount: 2,
            topScore: 91,
          },
        ]);
      },
    );

    await expect(useCase.execute({ riskProfile: 'low' })).resolves.toEqual({
      total: 2,
      categories: [
        {
          id: 'global-equity',
          label: 'Renta variable global',
          fundCount: 2,
          topScore: 91,
        },
        {
          id: 'us-equity',
          label: 'Renta variable USA',
          fundCount: 1,
          topScore: 88,
        },
      ],
    });

    expect(repository.countMany).toHaveBeenCalledTimes(1);
    expect(repository.getCatalogCategoryMetrics).toHaveBeenCalledTimes(1);
  });

  it('should include unknown risk levels in the medium profile', async () => {
    repository.countMany.mockImplementation((where: unknown) => {
      expect(JSON.stringify(where)).toContain('"riskLevel":null');
      expect(JSON.stringify(where)).toContain('"riskLevel":{"gte":3,"lte":5}');

      return Promise.resolve(12);
    });
    repository.getCatalogCategoryMetrics.mockResolvedValue([]);

    await expect(useCase.execute({ riskProfile: 'medium' })).resolves.toEqual({
      total: 12,
      categories: [],
    });
  });

  it.each([['high', '"riskLevel":{"gte":6,"lte":7}']])(
    'should map %s risk profile to the expected risk range',
    async (riskProfile, expected) => {
      repository.countMany.mockImplementation((where: unknown) => {
        expect(JSON.stringify(where)).toContain(expected);

        return Promise.resolve(0);
      });
      repository.getCatalogCategoryMetrics.mockResolvedValue([]);

      await expect(useCase.execute({ riskProfile })).resolves.toEqual({
        total: 0,
        categories: [],
      });
    },
  );

  it('should not add a risk range for the all risk profile', async () => {
    repository.countMany.mockImplementation((where: unknown) => {
      expect(JSON.stringify(where)).not.toContain('"riskLevel"');

      return Promise.resolve(0);
    });
    repository.getCatalogCategoryMetrics.mockImplementation(
      (where: unknown) => {
        expect(JSON.stringify(where)).not.toContain('"riskLevel"');

        return Promise.resolve([]);
      },
    );

    await expect(useCase.execute({ riskProfile: 'all' })).resolves.toEqual({
      total: 0,
      categories: [],
    });
  });

  it('should reject invalid risk profiles', async () => {
    await expect(
      useCase.execute({ riskProfile: 'tiny' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
