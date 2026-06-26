import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { isPaidPlanCapabilityError } from './sync-capability.utils';

const FMP_PROVIDER = 'financial-modeling-prep';

describe('isPaidPlanCapabilityError', () => {
  it('should return true for FMP paid-plan HTTP status codes', () => {
    expect(
      isPaidPlanCapabilityError(
        new ExternalHttpError({
          message: 'Payment required',
          statusCode: 402,
          provider: FMP_PROVIDER,
        }),
      ),
    ).toBe(true);
    expect(
      isPaidPlanCapabilityError(
        new ExternalHttpError({
          message: 'Forbidden',
          statusCode: 403,
          provider: FMP_PROVIDER,
        }),
      ),
    ).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(
      isPaidPlanCapabilityError(
        new ExternalHttpError({
          message: 'Not found',
          statusCode: 404,
          provider: FMP_PROVIDER,
        }),
      ),
    ).toBe(false);
    expect(isPaidPlanCapabilityError(new Error('boom'))).toBe(false);
  });
});
