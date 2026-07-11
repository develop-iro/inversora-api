import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { isDeviceTokenFormatValid } from '../entities/device-token.utils';
import { AnonymousDevicesRepository } from '../repositories/anonymous-devices.repository';

export type AnonymousDeviceRequestContext = {
  readonly deviceId: string;
};

export const ANONYMOUS_DEVICE_REQUEST_KEY = 'anonymousDevice';

/**
 * Validates `X-Device-Token` and attaches the resolved device id to the request.
 */
@Injectable()
export class DeviceTokenGuard implements CanActivate {
  constructor(
    private readonly anonymousDevicesRepository: AnonymousDevicesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const headerValue = request.header('x-device-token');

    if (!headerValue || !isDeviceTokenFormatValid(headerValue)) {
      throw new UnauthorizedException('Device token is required.');
    }

    const device =
      await this.anonymousDevicesRepository.findByToken(headerValue);

    if (!device) {
      throw new UnauthorizedException('Device token is invalid.');
    }

    const deviceContext: AnonymousDeviceRequestContext = {
      deviceId: device.id,
    };

    Object.assign(request, {
      [ANONYMOUS_DEVICE_REQUEST_KEY]: deviceContext,
    });

    return true;
  }
}
