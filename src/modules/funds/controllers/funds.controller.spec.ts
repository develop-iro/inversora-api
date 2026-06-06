import { Test, TestingModule } from '@nestjs/testing';
import { FundsController } from './funds.controller';
import { FundsService } from '../services/funds.service';

describe('FundsController', () => {
  let controller: FundsController;
  let service: { listFunds: jest.Mock; getFundById: jest.Mock };

  beforeEach(async () => {
    service = {
      listFunds: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      getFundById: jest.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: 'SPY',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundsController],
      providers: [
        {
          provide: FundsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<FundsController>(FundsController);
  });

  it('should delegate fund listing to the service', async () => {
    const query = { page: '1', limit: '10' };

    await controller.listFunds(query);

    expect(service.listFunds).toHaveBeenCalledWith(query);
  });

  it('should delegate fund detail reads to the service', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await controller.getFundById(fundId);

    expect(service.getFundById).toHaveBeenCalledWith(fundId);
  });
});
