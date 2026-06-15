import { Test, TestingModule } from '@nestjs/testing';
import type { FundDetailResponse } from '../entities/fund-detail.schema';
import { GetFundByIsinUseCase } from '../get-fund-by-isin';
import { FundDetailService } from './fund-detail.service';

describe('FundDetailService', () => {
  let service: FundDetailService;
  let getFundByIsinUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    getFundByIsinUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundDetailService,
        {
          provide: GetFundByIsinUseCase,
          useValue: getFundByIsinUseCase,
        },
      ],
    }).compile();

    service = module.get(FundDetailService);
  });

  it('should delegate fund detail reads to GetFundByIsinUseCase', async () => {
    const response = {
      fund: { isin: 'US78462F1030' },
    } as FundDetailResponse;
    getFundByIsinUseCase.execute.mockResolvedValue(response);

    await expect(service.getFundDetailByIsin('US78462F1030')).resolves.toBe(
      response,
    );
    expect(getFundByIsinUseCase.execute).toHaveBeenCalledWith('US78462F1030');
  });
});
