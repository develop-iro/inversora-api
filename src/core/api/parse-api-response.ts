import { Logger, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

import { parseAppEnvironment } from '../../shared/config/app-environment';

const logger = new Logger('ApiResponseParser');
const MAX_LOG_PAYLOAD_LENGTH = 2_000;

/**
 * Returns whether response validation logs should include payload excerpts.
 */
function shouldLogResponsePayload(): boolean {
  return parseAppEnvironment(process.env.APP_ENV) === 'local';
}

/**
 * Serializes a payload for debug logging, truncating oversized values.
 *
 * @param payload - Raw payload to log.
 */
function serializePayloadForLog(payload: unknown): string {
  try {
    const serialized = JSON.stringify(payload);

    if (serialized.length <= MAX_LOG_PAYLOAD_LENGTH) {
      return serialized;
    }

    return `${serialized.slice(0, MAX_LOG_PAYLOAD_LENGTH)}…`;
  } catch {
    return String(payload);
  }
}

/**
 * Validates an assembled API response against a Zod schema.
 *
 * @param schema - Response schema to validate against.
 * @param data - Assembled response payload.
 * @param context - Human-readable context for logs and error payloads.
 * @returns Parsed and typed response.
 */
export function parseApiResponse<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
  context: string,
): z.infer<TSchema> {
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  if (shouldLogResponsePayload()) {
    logger.error(
      `Response validation failed for ${context}: ${serializePayloadForLog(data)}`,
    );
  } else {
    logger.error(
      `Response validation failed for ${context}: ${parsed.error.issues.length} issue(s)`,
    );
  }

  throw new UnprocessableEntityException({
    message: 'Response payload failed schema validation',
    context,
    issues:
      parseAppEnvironment(process.env.APP_ENV) === 'pro'
        ? undefined
        : z.treeifyError(parsed.error),
  });
}
