import { Test, TestingModule } from '@nestjs/testing';
import { FundsController } from './funds.controller';
import { FundsService } from '../services/funds.service';

describe('FundsController', () => {
  let controller: FundsController;
  let service: {
    listFunds: jest.Mock;
    getFundById: jest.Mock;
    getFundChart: jest.Mock;
    getFundHoldings: jest.Mock;
    getFundCountryExposure: jest.Mock;
    getFundSectorExposure: jest.Mock;
  };

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
      getFundChart: jest.fn().mockResolvedValue({
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        period: '1Y',
        from: '2023-01-31',
        to: '2024-01-31',
        asOf: '2024-01-31',
        points: [],
      }),
      getFundHoldings: jest.fn().mockResolvedValue({
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: '2024-01-31',
        holdings: [],
      }),
      getFundCountryExposure: jest.fn().mockResolvedValue({
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: '2024-01-31',
        countries: [],
      }),
      getFundSectorExposure: jest.fn().mockResolvedValue({
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: '2024-01-31',
        sectors: [],
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

  it('should delegate chart reads to the service', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    const query = { period: '3M' };

    await controller.getFundChart(fundId, query);

    expect(service.getFundChart).toHaveBeenCalledWith(fundId, query);
  });

  it('should delegate holdings reads to the service', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    const query = { asOf: '2024-01-31' };

    await controller.getFundHoldings(fundId, query);

    expect(service.getFundHoldings).toHaveBeenCalledWith(fundId, query);
  });

  it('should delegate country exposure reads to the service', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    const query = { asOf: '2024-01-31' };

    await controller.getFundCountryExposure(fundId, query);

    expect(service.getFundCountryExposure).toHaveBeenCalledWith(fundId, query);
  });

  it('should delegate sector exposure reads to the service', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    const query = { asOf: '2024-01-31' };

    await controller.getFundSectorExposure(fundId, query);

    expect(service.getFundSectorExposure).toHaveBeenCalledWith(fundId, query);
  });
});
