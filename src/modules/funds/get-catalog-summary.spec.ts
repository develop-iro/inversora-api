import { Test, TestingModule } from '@nestjs/testing';
import { GetCatalogSummaryUseCase } from './get-catalog-summary';
import { FundsRepository } from './repositories/funds.repository';

describe('GetCatalogSummaryUseCase', () => {
  let useCase: GetCatalogSummaryUseCase;
  let repository: { countByCatalogVisibility: jest.Mock };

  beforeEach(async () => {
    repository = {
      countByCatalogVisibility: jest.fn().mockResolvedValue({
        visible: 10,
        quarantined: 3,
        blocked: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCatalogSummaryUseCase,
        {
          provide: FundsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    useCase = module.get(GetCatalogSummaryUseCase);
  });

  it('should return aggregate catalog counts', async () => {
    const result = await useCase.execute();

    expect(result.total).toBe(14);
    expect(result.byVisibility).toEqual({
      visible: 10,
      quarantined: 3,
      blocked: 1,
    });
    expect(result.asOf).toEqual(expect.any(String));
  });
});
