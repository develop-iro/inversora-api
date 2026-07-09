import { Logger, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';
import { parseApiResponse } from './parse-api-response';

describe('parseApiResponse', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return parsed data when the schema matches', () => {
    const schema = z.object({
      id: z.string(),
      score: z.number(),
    });

    expect(
      parseApiResponse(schema, { id: 'fund-1', score: 80 }, 'test-context'),
    ).toEqual({
      id: 'fund-1',
      score: 80,
    });
  });

  it('should throw UnprocessableEntityException when validation fails', () => {
    const schema = z.object({
      id: z.uuid(),
    });

    expect(() =>
      parseApiResponse(schema, { id: 'not-a-uuid' }, 'invalid-response'),
    ).toThrow(UnprocessableEntityException);

    try {
      parseApiResponse(schema, { id: 'not-a-uuid' }, 'invalid-response');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          message: 'Response payload failed schema validation',
          context: 'invalid-response',
        },
      });
    }
  });

  it('should log invalid payloads for debugging', () => {
    const schema = z.object({ total: z.number().int() });
    const errorSpy = jest.spyOn(Logger.prototype, 'error');

    expect(() =>
      parseApiResponse(schema, { total: 'invalid' }, 'rankings'),
    ).toThrow(UnprocessableEntityException);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Response validation failed for rankings'),
    );
  });

  it('should serialize circular payloads without throwing during logging', () => {
    const schema = z.object({ id: z.uuid() });
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(() =>
      parseApiResponse(schema, circular, 'circular-response'),
    ).toThrow(UnprocessableEntityException);
  });

  it('should truncate oversized invalid payloads in logs', () => {
    const schema = z.object({ id: z.uuid() });
    const oversized = { id: 'x'.repeat(3_000) };

    expect(() =>
      parseApiResponse(schema, oversized, 'oversized-response'),
    ).toThrow(UnprocessableEntityException);
  });

  it('should omit issue details in production validation errors', () => {
    const previousAppEnv = process.env.APP_ENV;
    process.env.APP_ENV = 'pro';

    const schema = z.object({ id: z.uuid() });

    try {
      parseApiResponse(schema, { id: 'not-a-uuid' }, 'pro-response');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          message: 'Response payload failed schema validation',
          context: 'pro-response',
          issues: undefined,
        },
      });
    } finally {
      process.env.APP_ENV = previousAppEnv;
    }
  });

  it('should log issue counts outside local environments', () => {
    const previousAppEnv = process.env.APP_ENV;
    process.env.APP_ENV = 'qa';
    const schema = z.object({ id: z.uuid() });
    const errorSpy = jest.spyOn(Logger.prototype, 'error');

    expect(() =>
      parseApiResponse(schema, { id: 'not-a-uuid' }, 'qa-response'),
    ).toThrow(UnprocessableEntityException);

    expect(errorSpy).toHaveBeenCalledWith(
      'Response validation failed for qa-response: 1 issue(s)',
    );

    process.env.APP_ENV = previousAppEnv;
  });
});
