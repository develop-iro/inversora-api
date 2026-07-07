import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { RANKING_FIXTURE_FUNDS } from '../../scoring/entities/ranking.fixtures';
import { FundLiveMarketSnapshotService } from './fund-live-market-snapshot.service';

describe('FundLiveMarketSnapshotService', () => {
  let service: FundLiveMarketSnapshotService;
  let fundsRepository: { findByIsin: jest.Mock };
  let catalogVisibilityService: { assertPublicCatalogVisible: jest.Mock };
  let fundPricesService: {
    getLatestDate: jest.Mock;
    getHistory: jest.Mock;
  };
  let fmpProvider: { getFundQuote: jest.Mock };

  const fund = RANKING_FIXTURE_FUNDS[0];

  beforeEach(async () => {
    fundsRepository = {
      findByIsin: jest.fn().mockResolvedValue(fund),
    };
    catalogVisibilityService = {
      assertPublicCatalogVisible: jest.fn(),
    };
    fundPricesService = {
      getLatestDate: jest.fn().mockResolvedValue('2026-06-27'),
      getHistory: jest.fn().mockResolvedValue([
        {
          id: 'price-1',
          fundId: fund.id,
          date: '2026-06-27',
          open: 540,
          high: 546,
          low: 539,
          close: 545,
          volume: null,
          change: 2,
          changePercent: 0.37,
          vwap: null,
          createdAt: new Date('2026-06-27T00:00:00.000Z'),
          updatedAt: new Date('2026-06-27T00:00:00.000Z'),
        },
      ]),
    };
    fmpProvider = {
      getFundQuote: jest.fn().mockResolvedValue({
        symbol: fund.symbol,
        price: 545.23,
        changePercent: 0.395,
        volume: 75234567,
        asOf: '2026-06-29T15:30:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundLiveMarketSnapshotService,
        { provide: FundsRepository, useValue: fundsRepository },
        {
          provide: CatalogVisibilityService,
          useValue: catalogVisibilityService,
        },
        { provide: FundPricesService, useValue: fundPricesService },
        { provide: FinancialModelingPrepProvider, useValue: fmpProvider },
      ],
    }).compile();

    service = module.get(FundLiveMarketSnapshotService);
  });

  it('should return a live quote when FMP provides one', async () => {
    const snapshot = await service.getByIsin(fund.isin!);

    expect(snapshot.freshness).toBe('live');
    expect(snapshot.price).toBe(545.23);
    expect(snapshot.changePercent).toBe(0.395);
  });

  it('should fall back to the latest EOD price when live quote is unavailable', async () => {
    fmpProvider.getFundQuote.mockResolvedValue(null);

    const snapshot = await service.getByIsin(fund.isin!);

    expect(snapshot.freshness).toBe('eod');
    expect(snapshot.price).toBe(545);
    expect(snapshot.changePercent).toBe(0.37);
  });

  it('should reject invalid ISIN values', async () => {
    await expect(service.getByIsin('invalid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should return not found for unknown funds', async () => {
    fundsRepository.findByIsin.mockResolvedValue(null);

    await expect(service.getByIsin(fund.isin!)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should return not found when the persisted fund has no ISIN', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      ...fund,
      isin: null,
    });

    await expect(service.getByIsin(fund.isin!)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should reuse cached snapshots within the TTL window', async () => {
    await service.getByIsin(fund.isin!);
    await service.getByIsin(fund.isin!);

    expect(fmpProvider.getFundQuote).toHaveBeenCalledTimes(1);
  });

  it('should fall back to EOD when the live quote request fails', async () => {
    fmpProvider.getFundQuote.mockRejectedValue(new Error('provider timeout'));

    const snapshot = await service.getByIsin(fund.isin!);

    expect(snapshot.freshness).toBe('eod');
    expect(snapshot.price).toBe(545);
  });

  it('should return unavailable when no live quote or EOD price exists', async () => {
    fmpProvider.getFundQuote.mockResolvedValue(null);
    fundPricesService.getLatestDate.mockResolvedValue(null);

    const snapshot = await service.getByIsin(fund.isin!);

    expect(snapshot.freshness).toBe('unavailable');
    expect(snapshot.price).toBeNull();
    expect(snapshot.changePercent).toBeNull();
  });

  it('should return unavailable when EOD history is empty despite a latest date', async () => {
    fmpProvider.getFundQuote.mockResolvedValue(null);
    fundPricesService.getLatestDate.mockResolvedValue('2026-06-27');
    fundPricesService.getHistory.mockResolvedValue([]);

    const snapshot = await service.getByIsin(fund.isin!);

    expect(snapshot.freshness).toBe('unavailable');
  });
});
