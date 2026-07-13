import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { MyInvestorMcpClient } from './myinvestor-mcp.client';
import { MyInvestorFixtureService } from './myinvestor.fixture.service';
import { MyInvestorProvider } from './myinvestor.provider';

describe('MyInvestorProvider', () => {
  let provider: MyInvestorProvider;
  let client: { callTool: jest.Mock };
  let fixtures: { readFixture: jest.Mock };

  const configMock = {
    myInvestorUsesMocks: true,
  } as { myInvestorUsesMocks: boolean };

  const vanguardRow = {
    isin: 'IE00B03HD191',
    name: 'Vanguard Global Stock Index Fund EUR Acc',
    product_type: 'FONDOS_INDEXADOS',
    management_company: 'Vanguard',
    ter: 0.18,
    risk_indicator: 4,
    tracking_error_1y: 1.56,
    nav_date: '2026-07-09T00:00:00Z',
    top_sectors: [{ name: 'Tecnología', pct: 31 }],
    top_regions: [],
  };

  const ishareRow = {
    isin: 'IE000N4ZYX28',
    name: 'iShares US Equity Index Fund clase S',
    product_type: 'FONDOS_INDEXADOS',
    management_company: 'BlackRock',
    ter: 0.05,
    top_sectors: [],
    top_regions: [],
  };

  beforeEach(async () => {
    client = { callTool: jest.fn() };
    fixtures = { readFixture: jest.fn() };
    configMock.myInvestorUsesMocks = true;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyInvestorProvider,
        { provide: MyInvestorMcpClient, useValue: client },
        { provide: MyInvestorFixtureService, useValue: fixtures },
        { provide: AppConfigService, useValue: configMock },
      ],
    }).compile();

    provider = module.get(MyInvestorProvider);
  });

  it('returns an empty array for blank ISIN lists without touching fixtures', async () => {
    await expect(provider.getFundsByIsin(['   '])).resolves.toEqual([]);
    expect(fixtures.readFixture).not.toHaveBeenCalled();
    expect(client.callTool).not.toHaveBeenCalled();
  });

  it('resolves funds by ISIN from fixtures in mock mode', async () => {
    fixtures.readFixture.mockResolvedValue({
      data: { funds: [vanguardRow, ishareRow] },
    });

    const funds = await provider.getFundsByIsin(['ie00b03hd191']);

    expect(funds).toHaveLength(1);
    expect(funds[0]).toMatchObject({
      isin: 'IE00B03HD191',
      managementCompany: 'Vanguard',
      ter: 0.18,
      trackingError1y: 1.56,
      navDate: '2026-07-09',
    });
    expect(client.callTool).not.toHaveBeenCalled();
  });

  it('calls the live MCP client when mocks are disabled', async () => {
    configMock.myInvestorUsesMocks = false;
    client.callTool.mockResolvedValue({
      data: { funds: [vanguardRow] },
    });

    const funds = await provider.getFundsByIsin(['IE00B03HD191']);

    expect(funds).toHaveLength(1);
    expect(client.callTool).toHaveBeenCalledWith('get_funds', {
      isins: ['IE00B03HD191'],
    });
    expect(fixtures.readFixture).not.toHaveBeenCalled();
  });

  it('searches index funds from fixtures with a limit', async () => {
    fixtures.readFixture.mockResolvedValue({
      data: { total_found: 2, funds: [vanguardRow, ishareRow] },
    });

    const funds = await provider.searchIndexFunds({ limit: 1 });

    expect(funds).toHaveLength(1);
    expect(funds[0]?.isin).toBe('IE00B03HD191');
  });

  it('passes the index fund filter to the live search tool', async () => {
    configMock.myInvestorUsesMocks = false;
    client.callTool.mockResolvedValue({
      data: { total_found: 1, funds: [ishareRow] },
    });

    const funds = await provider.searchIndexFunds({ limit: 5 });

    expect(funds).toHaveLength(1);
    expect(client.callTool).toHaveBeenCalledWith('search_funds', {
      product_type: 'FONDOS_INDEXADOS',
      limit: 5,
    });
  });

  it('throws ExternalHttpError for malformed payloads', async () => {
    fixtures.readFixture.mockResolvedValue({ unexpected: true });

    await expect(
      provider.getFundsByIsin(['IE00B03HD191']),
    ).rejects.toBeInstanceOf(ExternalHttpError);
  });
});
