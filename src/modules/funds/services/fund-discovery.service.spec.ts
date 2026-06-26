import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { FundDiscoveryService } from './fund-discovery.service';

describe('FundDiscoveryService', () => {
  let service: FundDiscoveryService;
  let config: {
    syncFundSymbols: readonly string[];
    syncEtfListDiscoveryEnabled: boolean;
    syncDiscoveryLimit: number;
    syncDiscoveryOffset: number;
    syncDiscoveryMode: 'all' | 'indexed';
  };
  let fmpProvider: { listEtfCatalogSymbols: jest.Mock };

  beforeEach(async () => {
    config = {
      syncFundSymbols: ['SPY'],
      syncEtfListDiscoveryEnabled: false,
      syncDiscoveryLimit: 50,
      syncDiscoveryOffset: 0,
      syncDiscoveryMode: 'all',
    };
    fmpProvider = {
      listEtfCatalogSymbols: jest.fn().mockResolvedValue(['VOO', 'VTI']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundDiscoveryService,
        {
          provide: AppConfigService,
          useValue: config,
        },
        {
          provide: FinancialModelingPrepProvider,
          useValue: fmpProvider,
        },
      ],
    }).compile();

    service = module.get(FundDiscoveryService);
  });

  it('should honor explicit symbols without adding curated tickers', async () => {
    await expect(
      service.resolveSyncSymbols({ explicitSymbols: ['QQQ'] }),
    ).resolves.toEqual(['QQQ']);
  });

  it('should merge configured symbols without curated tickers when discovery is off', async () => {
    await expect(service.resolveSyncSymbols()).resolves.toEqual(['SPY']);
  });

  it('should append curated non-US tickers when discovery is enabled', async () => {
    config.syncEtfListDiscoveryEnabled = true;

    await expect(service.resolveSyncSymbols()).resolves.toEqual([
      'SPY',
      'VOO',
      'VTI',
      'IWDA.L',
      'CSPX.L',
      'VWCE.DE',
    ]);

    expect(fmpProvider.listEtfCatalogSymbols).toHaveBeenCalledWith({
      mode: 'all',
      offset: 0,
      limit: 50,
    });
  });
});
