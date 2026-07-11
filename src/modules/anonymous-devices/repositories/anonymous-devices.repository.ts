import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';
import type { AnonymousEducationalProfileInput } from '../entities/anonymous-educational-profile.schema';
import {
  generateDeviceToken,
  hashDeviceToken,
} from '../entities/device-token.utils';
import type { RegisterAnonymousDeviceInput } from '../entities/register-device.schema';

type AnonymousDeviceRecord = {
  readonly id: string;
  readonly tokenHash: string;
  readonly platform: string;
  readonly appVersion: string | null;
};

/**
 * Persistence layer for anonymous device registration and profile sync.
 */
@Injectable()
export class AnonymousDevicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new anonymous device row.
   *
   * @param input - Registration payload from the mobile client.
   */
  async createDevice(input: RegisterAnonymousDeviceInput): Promise<{
    device: AnonymousDeviceRecord;
    deviceToken: string;
  }> {
    const deviceToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(deviceToken);

    const device = await this.prisma.anonymousDevice.create({
      data: {
        tokenHash,
        platform: input.platform,
        appVersion: input.appVersion,
      },
      select: {
        id: true,
        tokenHash: true,
        platform: true,
        appVersion: true,
      },
    });

    return { device, deviceToken };
  }

  /**
   * Resolves a device by its plain token.
   *
   * @param deviceToken - Plain device token from request headers.
   */
  async findByToken(
    deviceToken: string,
  ): Promise<AnonymousDeviceRecord | null> {
    const tokenHash = hashDeviceToken(deviceToken);

    return this.prisma.anonymousDevice.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        tokenHash: true,
        platform: true,
        appVersion: true,
      },
    });
  }

  /**
   * Updates heartbeat metadata for a device.
   *
   * @param deviceId - Anonymous device identifier.
   * @param appVersion - Optional app version reported by the client.
   */
  async touchDevice(deviceId: string, appVersion?: string): Promise<void> {
    await this.prisma.anonymousDevice.update({
      where: { id: deviceId },
      data: {
        appVersion,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Upserts the derived educational profile for a device.
   *
   * @param deviceId - Anonymous device identifier.
   * @param profile - Derived profile payload from the mobile client.
   */
  async upsertEducationalProfile(
    deviceId: string,
    profile: AnonymousEducationalProfileInput,
  ): Promise<void> {
    await this.prisma.anonymousEducationalProfile.upsert({
      where: { deviceId },
      create: {
        deviceId,
        knowledgeLevel: profile.knowledgeLevel,
        riskOrientation: profile.riskOrientation,
        investmentHorizon: profile.investmentHorizon,
        investorStyle: profile.investorStyle,
        financialReadiness: profile.financialReadiness,
        learningGoal: profile.learningGoal,
        profileVersion: profile.profileVersion,
        completedAt: new Date(profile.completedAt),
      },
      update: {
        knowledgeLevel: profile.knowledgeLevel,
        riskOrientation: profile.riskOrientation,
        investmentHorizon: profile.investmentHorizon,
        investorStyle: profile.investorStyle,
        financialReadiness: profile.financialReadiness,
        learningGoal: profile.learningGoal,
        profileVersion: profile.profileVersion,
        completedAt: new Date(profile.completedAt),
      },
    });
  }
}
