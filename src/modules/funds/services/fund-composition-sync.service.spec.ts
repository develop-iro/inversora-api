import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { FundsRepository } from '../repositories/funds.repository';
import { FundCompositionService } from './fund-composition.service';
import { FundCompositionSyncService } from './fund-composition-sync.service';

describe('FundCompositionSyncService', () => {
  let service: FundCompositionSyncService;
  let fmpProvider: { getFundComposition: jest.Mock };
  let fundsRepository: { findBySymbolAndProvider: jest.Mock };
  let fundCompositionService: { saveProviderComposition: jest.Mock };

  beforeEach(async () => {
    fmpProvider = {
      getFundComposition: jest.fn().mockResolvedValue({
        asOf: '2024-01-31',
        holdings: [
          {
            asset: 'AAPL',
            name: 'Apple Inc.',
            weightPercentage: 7.12,
          },
        ],
        sectorWeightings: [
          {
            sector: 'Technology',
            weightPercentage: 31.5,
          },
        ],
        countryWeightings: [
          {
            country: 'United States',
            weightPercentage: 97.5,
          },
        ],
      }),
    };
    fundsRepository = {
      findBySymbolAndProvider: jest.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: 'SPY',
      }),
    };
    fundCompositionService = {
      saveProviderComposition: jest.fn().mockResolvedValue({
        holdings: 1,
        allocations: 2,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundCompositionSyncService,
        {
          provide: FinancialModelingPrepProvider,
          useValue: fmpProvider,
        },
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundCompositionService,
          useValue: fundCompositionService,
        },
      ],
    }).compile();

    service = module.get<FundCompositionSyncService>(
      FundCompositionSyncService,
    );
  });

  it('should import composition from FMP and persist a snapshot', async () => {
    await expect(service.syncFromFmp('spy')).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'SPY',
      asOf: '2024-01-31',
      holdingsSynced: 1,
      allocationsSynced: 2,
    });

    expect(fundsRepository.findBySymbolAndProvider).toHaveBeenCalledWith(
      'SPY',
      'financial-modeling-prep',
    );
    expect(fmpProvider.getFundComposition).toHaveBeenCalledWith('SPY');
    expect(fundCompositionService.saveProviderComposition).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      '2024-01-31',
      [
        {
          asset: 'AAPL',
          name: 'Apple Inc.',
          weightPercentage: 7.12,
        },
      ],
      [
        {
          category: 'sectorial',
          label: 'Technology',
          weight: 31.5,
          sortOrder: 0,
        },
        {
          category: 'countries',
          label: 'United States',
          weight: 97.5,
          sortOrder: 0,
        },
      ],
    );
  });

  it('should reject composition sync when fund metadata is missing', async () => {
    fundsRepository.findBySymbolAndProvider.mockResolvedValueOnce(null);

    await expect(service.syncFromFmp('SPY')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
