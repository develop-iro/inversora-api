import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import {
  ANONYMOUS_DEVICE_REQUEST_KEY,
  DeviceTokenGuard,
} from './device-token.guard';
import type { AnonymousDevicesRepository } from '../repositories/anonymous-devices.repository';
import { generateDeviceToken } from '../entities/device-token.utils';

describe('DeviceTokenGuard', () => {
  let guard: DeviceTokenGuard;
  let findByToken: jest.Mock;
  let request: {
    header: jest.Mock;
    [ANONYMOUS_DEVICE_REQUEST_KEY]?: { deviceId: string };
  };

  const createContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    findByToken = jest.fn();
    guard = new DeviceTokenGuard({
      findByToken,
    } as unknown as AnonymousDevicesRepository);
    request = {
      header: jest.fn(),
    };
  });

  it('rejects requests without a device token header', async () => {
    request.header.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findByToken).not.toHaveBeenCalled();
  });

  it('rejects malformed device tokens', async () => {
    request.header.mockReturnValue('invalid-token');

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findByToken).not.toHaveBeenCalled();
  });

  it('rejects unknown device tokens', async () => {
    const deviceToken = generateDeviceToken();

    request.header.mockReturnValue(deviceToken);
    findByToken.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findByToken).toHaveBeenCalledWith(deviceToken);
  });

  it('attaches the resolved device id to the request', async () => {
    const deviceToken = generateDeviceToken();

    request.header.mockReturnValue(deviceToken);
    findByToken.mockResolvedValue({
      id: 'device-42',
      tokenHash: 'hash',
      platform: 'ios',
      appVersion: '1.0.0',
    });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(request[ANONYMOUS_DEVICE_REQUEST_KEY]).toEqual({
      deviceId: 'device-42',
    });
  });
});
