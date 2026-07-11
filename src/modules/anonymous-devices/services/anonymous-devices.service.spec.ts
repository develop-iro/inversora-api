import type { AnonymousDevicesRepository } from '../repositories/anonymous-devices.repository';
import { AnonymousDevicesService } from './anonymous-devices.service';

describe('AnonymousDevicesService', () => {
  it('registers a device and returns token plus id', async () => {
    const repository: Pick<AnonymousDevicesRepository, 'createDevice'> = {
      createDevice: jest.fn().mockResolvedValue({
        device: {
          id: 'device-1',
          tokenHash: 'hash',
          platform: 'ios',
          appVersion: '1.0.0',
        },
        deviceToken: 'dev_test_token',
      }),
    };

    const service = new AnonymousDevicesService(
      repository as AnonymousDevicesRepository,
    );
    const result = await service.registerDevice({
      platform: 'ios',
      appVersion: '1.0.0',
    });

    expect(result.deviceId).toBe('device-1');
    expect(result.deviceToken).toBe('dev_test_token');
  });

  it('upserts educational profile for authenticated device', async () => {
    const upsertEducationalProfile = jest.fn().mockResolvedValue(undefined);

    const repository: Pick<
      AnonymousDevicesRepository,
      'upsertEducationalProfile'
    > = {
      upsertEducationalProfile,
    };

    const service = new AnonymousDevicesService(
      repository as AnonymousDevicesRepository,
    );
    const result = await service.upsertEducationalProfile('device-1', {
      knowledgeLevel: 'beginner',
      riskOrientation: 'moderate',
      investmentHorizon: 'medium',
      investorStyle: 'balanced',
      financialReadiness: 'caution',
      learningGoal: 'learn-basics',
      profileVersion: 2,
      completedAt: '2026-07-11T12:00:00.000Z',
    });

    expect(upsertEducationalProfile).toHaveBeenCalledWith('device-1', {
      knowledgeLevel: 'beginner',
      riskOrientation: 'moderate',
      investmentHorizon: 'medium',
      investorStyle: 'balanced',
      financialReadiness: 'caution',
      learningGoal: 'learn-basics',
      profileVersion: 2,
      completedAt: '2026-07-11T12:00:00.000Z',
    });
    expect(result).toEqual({ saved: true, deviceId: 'device-1' });
  });

  it('updates heartbeat metadata for authenticated devices', async () => {
    const touchDevice = jest.fn().mockResolvedValue(undefined);

    const repository: Pick<AnonymousDevicesRepository, 'touchDevice'> = {
      touchDevice,
    };

    const service = new AnonymousDevicesService(
      repository as AnonymousDevicesRepository,
    );
    const result = await service.heartbeat('device-1', { appVersion: '1.2.0' });

    expect(touchDevice).toHaveBeenCalledWith('device-1', '1.2.0');
    expect(result).toEqual({ ok: true });
  });
});
