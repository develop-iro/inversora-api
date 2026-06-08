import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { writeFile } from 'node:fs/promises';
import { AppConfigService } from '../../../shared/config/config.service';
import {
  FMP_FIXTURE_FILES,
  FinancialModelingPrepFixtureService,
} from './financial-modeling-prep.fixture.service';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('FinancialModelingPrepFixtureService', () => {
  let service: FinancialModelingPrepFixtureService;
  let config: { fmpSaveFixtures: boolean };

  beforeEach(async () => {
    config = { fmpSaveFixtures: false };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialModelingPrepFixtureService,
        {
          provide: AppConfigService,
          useValue: config,
        },
      ],
    }).compile();

    service = module.get(FinancialModelingPrepFixtureService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should read a committed fixture file', async () => {
    const payload = [{ symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' }];
    const { readFile } = jest.requireMock<{ readFile: jest.Mock }>(
      'node:fs/promises',
    );
    readFile.mockResolvedValueOnce(JSON.stringify(payload));

    await expect(
      service.readFixture(FMP_FIXTURE_FILES.etfInfo),
    ).resolves.toEqual(payload);
  });

  it('should skip saving fixtures when disabled in config', async () => {
    await service.saveFixtureIfEnabled(FMP_FIXTURE_FILES.etfInfo, []);

    expect(writeFile).not.toHaveBeenCalled();
  });

  it('should persist fixtures when saving is enabled', async () => {
    config.fmpSaveFixtures = true;

    await service.saveFixtureIfEnabled(FMP_FIXTURE_FILES.etfInfo, [
      { symbol: 'SPY' },
    ]);

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining(FMP_FIXTURE_FILES.etfInfo),
      `${JSON.stringify([{ symbol: 'SPY' }], null, 2)}\n`,
      'utf8',
    );
  });

  it('should filter search fixtures by symbol or name', () => {
    const data = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
      { invalid: true },
    ];

    expect(service.filterSearchFixture(data, 'spy')).toEqual([data[0]]);
    expect(service.filterSearchFixture(data, 'invesco')).toEqual([data[1]]);
    expect(service.filterSearchFixture(data, '')).toEqual([]);
    expect(service.filterSearchFixture('not-an-array', 'spy')).toEqual([]);
  });

  it('should filter historical fixtures by optional date range', () => {
    const data = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-15', close: 101 },
      { date: '2024-01-31', close: 102 },
      { invalid: true },
    ];

    expect(service.filterHistoricalFixture(data)).toEqual([
      data[0],
      data[1],
      data[2],
      data[3],
    ]);
    expect(service.filterHistoricalFixture(data, '2024-01-10')).toEqual([
      data[1],
      data[2],
    ]);
    expect(
      service.filterHistoricalFixture(data, undefined, '2024-01-20'),
    ).toEqual([data[0], data[1], data[3]]);
    expect(service.filterHistoricalFixture('not-an-array')).toEqual([]);
  });
});
