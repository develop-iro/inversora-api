import { Test, TestingModule } from '@nestjs/testing';
import { FeaturedFundsController } from './featured-funds.controller';
import { FeaturedFundsService } from '../services/featured-funds.service';

describe('FeaturedFundsController', () => {
  let controller: FeaturedFundsController;
  let featuredFundsService: { getFeaturedFunds: jest.Mock };

  const response = {
    quarter: '2026-Q2',
    quarterTag: 'Q2 2026',
    periodStart: '2026-04-01',
    periodEnd: '2026-06-30',
    data: [],
  };

  beforeEach(async () => {
    featuredFundsService = {
      getFeaturedFunds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeaturedFundsController],
      providers: [
        {
          provide: FeaturedFundsService,
          useValue: featuredFundsService,
        },
      ],
    }).compile();

    controller = module.get(FeaturedFundsController);
  });

  it('should delegate featured funds requests to the service', async () => {
    featuredFundsService.getFeaturedFunds.mockResolvedValue(response);

    await expect(
      controller.getFeaturedFunds({ quarter: '2026-Q2', limit: '2' }),
    ).resolves.toEqual(response);
    expect(featuredFundsService.getFeaturedFunds).toHaveBeenCalledWith({
      quarter: '2026-Q2',
      limit: '2',
    });
  });
});
