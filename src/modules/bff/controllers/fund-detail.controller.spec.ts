import { Test, TestingModule } from '@nestjs/testing';
import { FundsService } from '../../funds/services/funds.service';
import { FundDetailController } from './fund-detail.controller';
import { FundDetailService } from '../services/fund-detail.service';
import { GetFundLiveMarketSnapshotUseCase } from '../get-fund-live-market-snapshot';

describe('FundDetailController', () => {
  let controller: FundDetailController;
  let fundDetailService: { getFundDetailByIsin: jest.Mock };
  let fundsService: { getFundById: jest.Mock };
  let getFundLiveMarketSnapshotUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    fundDetailService = {
      getFundDetailByIsin: jest.fn().mockResolvedValue({
        fund: { isin: 'US78462F1030' },
        inversoraScore: 82,
      }),
    };
    fundsService = {
      getFundById: jest.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: 'SPY',
      }),
    };
    getFundLiveMarketSnapshotUseCase = {
      execute: jest.fn().mockResolvedValue({
        isin: 'US78462F1030',
        symbol: 'SPY',
        freshness: 'live',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundDetailController],
      providers: [
        { provide: FundDetailService, useValue: fundDetailService },
        { provide: FundsService, useValue: fundsService },
        {
          provide: GetFundLiveMarketSnapshotUseCase,
          useValue: getFundLiveMarketSnapshotUseCase,
        },
      ],
    }).compile();

    controller = module.get<FundDetailController>(FundDetailController);
  });

  it('should delegate ISIN routes to the BFF aggregator', async () => {
    await controller.getFundByIdentifier('US78462F1030');

    expect(fundDetailService.getFundDetailByIsin).toHaveBeenCalledWith(
      'US78462F1030',
    );
    expect(fundsService.getFundById).not.toHaveBeenCalled();
  });

  it('should delegate UUID routes to the core fund service', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await controller.getFundByIdentifier(fundId);

    expect(fundsService.getFundById).toHaveBeenCalledWith(fundId);
    expect(fundDetailService.getFundDetailByIsin).not.toHaveBeenCalled();
  });

  it('should delegate market snapshot routes to the live snapshot use case', async () => {
    await controller.getFundMarketSnapshot('US78462F1030');

    expect(getFundLiveMarketSnapshotUseCase.execute).toHaveBeenCalledWith(
      'US78462F1030',
    );
  });
});
