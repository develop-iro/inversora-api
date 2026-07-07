import { Test, TestingModule } from '@nestjs/testing';
import { GetFundLiveMarketSnapshotUseCase } from './get-fund-live-market-snapshot';
import { FundLiveMarketSnapshotService } from './services/fund-live-market-snapshot.service';

describe('GetFundLiveMarketSnapshotUseCase', () => {
  let useCase: GetFundLiveMarketSnapshotUseCase;
  let fundLiveMarketSnapshotService: { getByIsin: jest.Mock };

  beforeEach(async () => {
    fundLiveMarketSnapshotService = {
      getByIsin: jest.fn().mockResolvedValue({
        isin: 'US78462F1030',
        symbol: 'SPY',
        price: 545.23,
        changePercent: 0.395,
        asOf: '2026-06-29T15:30:00.000Z',
        freshness: 'live',
        sourceLabel: 'Financial Modeling Prep',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFundLiveMarketSnapshotUseCase,
        {
          provide: FundLiveMarketSnapshotService,
          useValue: fundLiveMarketSnapshotService,
        },
      ],
    }).compile();

    useCase = module.get(GetFundLiveMarketSnapshotUseCase);
  });

  it('should delegate market snapshot resolution to the service', async () => {
    const snapshot = await useCase.execute('US78462F1030');

    expect(fundLiveMarketSnapshotService.getByIsin).toHaveBeenCalledWith(
      'US78462F1030',
    );
    expect(snapshot.freshness).toBe('live');
  });
});
