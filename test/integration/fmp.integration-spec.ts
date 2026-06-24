import type { TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../src/shared/config/config.service';
import { FinancialModelingPrepProvider } from '../../src/modules/providers/financial-modeling-prep/financial-modeling-prep.provider';
import {
  createProvidersIntegrationModule,
  INTEGRATION_FUND_SYMBOL,
} from './integration-test.utils';

describe('Financial Modeling Prep (integration)', () => {
  let moduleRef: TestingModule | undefined;
  let provider: FinancialModelingPrepProvider;
  let config: AppConfigService;

  beforeAll(async () => {
    moduleRef = await createProvidersIntegrationModule();
    provider = moduleRef.get(FinancialModelingPrepProvider);
    config = moduleRef.get(AppConfigService);
  });

  afterAll(async () => {
    if (moduleRef !== undefined) {
      await moduleRef.close();
    }
  });

  it('should use committed fixtures in mock mode', () => {
    expect(config.fmpUsesMocks).toBe(true);
  });

  it('should search index funds from fixture data', async () => {
    const results = await provider.searchIndexedProducts(
      INTEGRATION_FUND_SYMBOL,
      {
        limit: 5,
      },
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.symbol).toBe(INTEGRATION_FUND_SYMBOL);
    expect(results[0]?.name.length).toBeGreaterThan(0);
  });

  it('should resolve index fund detail from fixtures', async () => {
    const detail = await provider.getFundDetail(INTEGRATION_FUND_SYMBOL, {
      from: '2024-01-01',
      to: '2024-01-31',
      includeHistory: false,
    });

    expect(detail.symbol).toBe(INTEGRATION_FUND_SYMBOL);
    expect(detail.name).toContain('SPDR');
    expect(detail.isin).toBe('US78462F1030');
    expect(detail.expenseRatio).toBeGreaterThan(0);
    expect(detail.priceSummary.latestClose).toBeGreaterThan(0);
  });

  it('should load historical prices from fixtures', async () => {
    const history = await provider.getFundHistory(INTEGRATION_FUND_SYMBOL, {
      from: '2024-01-01',
      to: '2024-01-31',
    });

    expect(history.length).toBeGreaterThan(0);
    expect(history[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(history[0]?.close).toBeGreaterThan(0);
  });
});
