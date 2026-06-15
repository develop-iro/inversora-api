import {
  CoreApiHttpClient,
  CoreApiModule,
  fundListResponseSchema,
  parseApiResponse,
} from './index';

describe('core/api index exports', () => {
  it('should expose the public core/api surface', () => {
    expect(CoreApiModule).toBeDefined();
    expect(CoreApiHttpClient).toBeDefined();
    expect(parseApiResponse).toBeDefined();
    expect(fundListResponseSchema).toBeDefined();
  });
});
