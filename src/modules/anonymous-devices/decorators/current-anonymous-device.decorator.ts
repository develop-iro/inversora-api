import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import {
  ANONYMOUS_DEVICE_REQUEST_KEY,
  type AnonymousDeviceRequestContext,
} from '../guards/device-token.guard';

/**
 * Reads the authenticated anonymous device context from the request.
 */
export const CurrentAnonymousDevice = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AnonymousDeviceRequestContext => {
    const request = context.switchToHttp().getRequest<Request>();
    const deviceContext = (request as Request & Record<string, unknown>)[
      ANONYMOUS_DEVICE_REQUEST_KEY
    ] as AnonymousDeviceRequestContext | undefined;

    if (!deviceContext) {
      throw new Error('Anonymous device context is missing.');
    }

    return deviceContext;
  },
);
