import { Injectable } from '@nestjs/common';

import type { AnonymousEducationalProfileInput } from '../entities/anonymous-educational-profile.schema';
import type {
  HeartbeatAnonymousDeviceInput,
  RegisterAnonymousDeviceInput,
  RegisterAnonymousDeviceResponse,
  UpsertAnonymousEducationalProfileResponse,
} from '../entities/register-device.schema';
import { AnonymousDevicesRepository } from '../repositories/anonymous-devices.repository';

/**
 * Registers anonymous devices and syncs derived educational profiles.
 */
@Injectable()
export class AnonymousDevicesService {
  constructor(
    private readonly anonymousDevicesRepository: AnonymousDevicesRepository,
  ) {}

  /**
   * Registers a new anonymous device installation.
   *
   * @param input - Registration payload from the mobile client.
   */
  async registerDevice(
    input: RegisterAnonymousDeviceInput,
  ): Promise<RegisterAnonymousDeviceResponse> {
    const { device, deviceToken } =
      await this.anonymousDevicesRepository.createDevice(input);

    return {
      deviceToken,
      deviceId: device.id,
    };
  }

  /**
   * Updates last-seen metadata for an authenticated device.
   *
   * @param deviceId - Anonymous device identifier.
   * @param input - Optional heartbeat payload.
   */
  async heartbeat(
    deviceId: string,
    input: HeartbeatAnonymousDeviceInput,
  ): Promise<{ ok: true }> {
    await this.anonymousDevicesRepository.touchDevice(
      deviceId,
      input.appVersion,
    );

    return { ok: true };
  }

  /**
   * Upserts the derived educational profile for an authenticated device.
   *
   * @param deviceId - Anonymous device identifier.
   * @param profile - Derived profile payload from the mobile client.
   */
  async upsertEducationalProfile(
    deviceId: string,
    profile: AnonymousEducationalProfileInput,
  ): Promise<UpsertAnonymousEducationalProfileResponse> {
    await this.anonymousDevicesRepository.upsertEducationalProfile(
      deviceId,
      profile,
    );

    return {
      saved: true,
      deviceId,
    };
  }
}
