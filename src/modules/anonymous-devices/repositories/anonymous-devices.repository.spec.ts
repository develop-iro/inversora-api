import { PrismaService } from '../../../shared/database/prisma.service';
import { AnonymousDevicesRepository } from './anonymous-devices.repository';

type AnonymousDeviceCreateInput = {
  data: {
    tokenHash: string;
    platform: string;
    appVersion: string;
  };
  select: {
    id: true;
    tokenHash: true;
    platform: true;
    appVersion: true;
  };
};

type AnonymousDeviceFindUniqueInput = {
  where: { tokenHash: string };
  select: {
    id: true;
    tokenHash: true;
    platform: true;
    appVersion: true;
  };
};

type AnonymousDeviceUpdateInput = {
  where: { id: string };
  data: {
    appVersion?: string;
    lastSeenAt: Date;
  };
};

type AnonymousEducationalProfileUpsertInput = {
  where: { deviceId: string };
  create: {
    deviceId: string;
    knowledgeLevel: string;
    riskOrientation: string;
    investmentHorizon: string;
    investorStyle: string;
    financialReadiness: string;
    learningGoal: string;
    profileVersion: number;
    completedAt: Date;
  };
  update: {
    knowledgeLevel: string;
    riskOrientation: string;
    investmentHorizon: string;
    investorStyle: string;
    financialReadiness: string;
    learningGoal: string;
    profileVersion: number;
    completedAt: Date;
  };
};

describe('AnonymousDevicesRepository', () => {
  let repository: AnonymousDevicesRepository;
  let prisma: {
    anonymousDevice: {
      create: jest.Mock<
        Promise<{
          id: string;
          tokenHash: string;
          platform: string;
          appVersion: string;
        }>,
        [AnonymousDeviceCreateInput]
      >;
      findUnique: jest.Mock<
        Promise<{
          id: string;
          tokenHash: string;
          platform: string;
          appVersion: string | null;
        } | null>,
        [AnonymousDeviceFindUniqueInput]
      >;
      update: jest.Mock<Promise<unknown>, [AnonymousDeviceUpdateInput]>;
    };
    anonymousEducationalProfile: {
      upsert: jest.Mock<
        Promise<unknown>,
        [AnonymousEducationalProfileUpsertInput]
      >;
    };
  };

  beforeEach(() => {
    prisma = {
      anonymousDevice: {
        create: jest
          .fn<
            Promise<{
              id: string;
              tokenHash: string;
              platform: string;
              appVersion: string;
            }>,
            [AnonymousDeviceCreateInput]
          >()
          .mockResolvedValue({
            id: 'device-1',
            tokenHash: 'stored-hash',
            platform: 'android',
            appVersion: '2.0.0',
          }),
        findUnique: jest.fn<
          Promise<{
            id: string;
            tokenHash: string;
            platform: string;
            appVersion: string | null;
          } | null>,
          [AnonymousDeviceFindUniqueInput]
        >(),
        update: jest.fn<Promise<unknown>, [AnonymousDeviceUpdateInput]>(),
      },
      anonymousEducationalProfile: {
        upsert: jest.fn<
          Promise<unknown>,
          [AnonymousEducationalProfileUpsertInput]
        >(),
      },
    };

    repository = new AnonymousDevicesRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('creates devices with hashed tokens', async () => {
    const result = await repository.createDevice({
      platform: 'android',
      appVersion: '2.0.0',
    });

    expect(result.device.id).toBe('device-1');
    expect(result.deviceToken.startsWith('dev_')).toBe(true);
    expect(prisma.anonymousDevice.create).toHaveBeenCalledTimes(1);

    const createInput: unknown =
      prisma.anonymousDevice.create.mock.calls[0]?.[0];

    expect(createInput).toMatchObject({
      data: {
        platform: 'android',
        appVersion: '2.0.0',
      },
      select: {
        id: true,
        tokenHash: true,
        platform: true,
        appVersion: true,
      },
    });

    const tokenHash = (createInput as { data: { tokenHash: string } }).data
      .tokenHash;

    expect(typeof tokenHash).toBe('string');
  });

  it('finds devices by plain token hash', async () => {
    prisma.anonymousDevice.findUnique.mockResolvedValue({
      id: 'device-2',
      tokenHash: 'hash',
      platform: 'ios',
      appVersion: null,
    });

    const device = await repository.findByToken('dev_' + 'a'.repeat(64));

    expect(device?.id).toBe('device-2');
    expect(prisma.anonymousDevice.findUnique).toHaveBeenCalledTimes(1);

    const findInput: unknown =
      prisma.anonymousDevice.findUnique.mock.calls[0]?.[0];

    expect(findInput).toMatchObject({
      select: {
        id: true,
        tokenHash: true,
        platform: true,
        appVersion: true,
      },
    });

    const tokenHash = (findInput as { where: { tokenHash: string } }).where
      .tokenHash;

    expect(typeof tokenHash).toBe('string');
  });

  it('updates heartbeat metadata', async () => {
    await repository.touchDevice('device-3', '3.1.0');

    expect(prisma.anonymousDevice.update).toHaveBeenCalledTimes(1);

    const updateInput: unknown =
      prisma.anonymousDevice.update.mock.calls[0]?.[0];

    expect(updateInput).toMatchObject({
      where: { id: 'device-3' },
      data: {
        appVersion: '3.1.0',
      },
    });

    const lastSeenAt = (updateInput as { data: { lastSeenAt: Date } }).data
      .lastSeenAt;

    expect(lastSeenAt).toBeInstanceOf(Date);
  });

  it('updates heartbeat metadata without app version', async () => {
    await repository.touchDevice('device-5');

    expect(prisma.anonymousDevice.update).toHaveBeenCalledTimes(1);

    const updateInput: unknown =
      prisma.anonymousDevice.update.mock.calls[0]?.[0];

    expect(updateInput).toMatchObject({
      where: { id: 'device-5' },
      data: {
        appVersion: undefined,
      },
    });

    const lastSeenAt = (updateInput as { data: { lastSeenAt: Date } }).data
      .lastSeenAt;

    expect(lastSeenAt).toBeInstanceOf(Date);
  });

  it('upserts educational profiles', async () => {
    await repository.upsertEducationalProfile('device-4', {
      knowledgeLevel: 'beginner',
      riskOrientation: 'moderate',
      investmentHorizon: 'medium',
      investorStyle: 'balanced',
      financialReadiness: 'caution',
      learningGoal: 'learn-basics',
      profileVersion: 1,
      completedAt: '2026-07-11T12:00:00.000Z',
    });

    expect(prisma.anonymousEducationalProfile.upsert).toHaveBeenCalledTimes(1);

    const upsertInput: unknown =
      prisma.anonymousEducationalProfile.upsert.mock.calls[0]?.[0];

    expect(upsertInput).toMatchObject({
      where: { deviceId: 'device-4' },
      create: {
        deviceId: 'device-4',
        knowledgeLevel: 'beginner',
        completedAt: new Date('2026-07-11T12:00:00.000Z'),
      },
      update: {
        knowledgeLevel: 'beginner',
        completedAt: new Date('2026-07-11T12:00:00.000Z'),
      },
    });
  });
});
