import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPricesService } from './fund-prices.service';
import { FundMaterializedReturnsService } from './fund-materialized-returns.service';

describe('FundMaterializedReturnsService', () => {
  let service: FundMaterializedReturnsService;
  let fundsRepository: { updateMaterializedReturns: jest.Mock };
  let fundPricesService: { getHistory: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      updateMaterializedReturns: jest.fn().mockResolvedValue(undefined),
    };
    fundPricesService = {
      getHistory: jest.fn().mockResolvedValue([
        { date: '2025-06-01', close: 100 },
        { date: '2026-06-01', close: 112 },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundMaterializedReturnsService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundPricesService,
          useValue: fundPricesService,
        },
      ],
    }).compile();

    service = module.get(FundMaterializedReturnsService);
  });

  it('should persist materialized returns from stored price history', async () => {
    await service.refreshForFundId('550e8400-e29b-41d4-a716-446655440000');

    expect(fundPricesService.getHistory).toHaveBeenCalled();
    expect(fundsRepository.updateMaterializedReturns).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({
        returnAsOf: expect.any(String) as string,
      }),
    );
    const [, payload] = fundsRepository.updateMaterializedReturns.mock
      .calls[0] as [
      string,
      { return1y: number | null; returnAsOf: string | null },
    ];
    expect(typeof payload.return1y).toBe('number');
  });
});
