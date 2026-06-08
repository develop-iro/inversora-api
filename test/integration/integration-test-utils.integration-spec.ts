import { assertSafeIntegrationDatabase } from './integration-test.utils';

describe('Integration test utilities', () => {
  it('should reject destructive tests against the default development database', () => {
    expect(() =>
      assertSafeIntegrationDatabase(
        'postgresql://inversora:inversora@localhost:5432/inversora',
      ),
    ).toThrow('Refusing to run destructive integration tests');
  });

  it('should allow destructive tests against an explicitly named test database', () => {
    expect(() =>
      assertSafeIntegrationDatabase(
        'postgresql://inversora:inversora@localhost:5432/inversora_integration_test',
      ),
    ).not.toThrow();
  });
});
