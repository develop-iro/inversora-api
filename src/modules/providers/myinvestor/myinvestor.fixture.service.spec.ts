import { MyInvestorFixtureService } from './myinvestor.fixture.service';

describe('MyInvestorFixtureService', () => {
  const service = new MyInvestorFixtureService();

  it('reads committed get-funds fixtures', async () => {
    const payload = (await service.readFixture(
      'get-funds.isins-sample.json',
    )) as { data?: { funds?: unknown[] } };

    expect(payload.data?.funds?.length).toBeGreaterThan(0);
  });

  it('reads committed search fixtures', async () => {
    const payload = (await service.readFixture(
      'search-funds.indexed-global.json',
    )) as { data?: { funds?: unknown[] } };

    expect(payload.data?.funds?.length).toBeGreaterThan(0);
  });
});
