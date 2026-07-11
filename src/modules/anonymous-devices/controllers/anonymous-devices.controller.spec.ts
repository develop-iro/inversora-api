import { Test, TestingModule } from '@nestjs/testing';

import { AnonymousDevicesController } from './anonymous-devices.controller';
import { DeviceTokenGuard } from '../guards/device-token.guard';
import { AnonymousDevicesService } from '../services/anonymous-devices.service';

describe('AnonymousDevicesController', () => {
  let controller: AnonymousDevicesController;
  let registerDevice: jest.Mock;
  let upsertEducationalProfile: jest.Mock;

  beforeEach(async () => {
    registerDevice = jest.fn();
    upsertEducationalProfile = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnonymousDevicesController],
      providers: [
        {
          provide: AnonymousDevicesService,
          useValue: {
            registerDevice,
            heartbeat: jest.fn(),
            upsertEducationalProfile,
          },
        },
      ],
    })
      .overrideGuard(DeviceTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnonymousDevicesController>(
      AnonymousDevicesController,
    );
  });

  it('registers anonymous devices', () => {
    registerDevice.mockReturnValue({
      deviceToken: 'dev_test',
      deviceId: 'device-1',
    });

    const response = controller.register({
      platform: 'ios',
      appVersion: '1.0.0',
    });

    expect(response).toEqual({ deviceToken: 'dev_test', deviceId: 'device-1' });
    expect(registerDevice).toHaveBeenCalledWith({
      platform: 'ios',
      appVersion: '1.0.0',
    });
  });

  it('upserts derived educational profiles for authenticated devices', () => {
    upsertEducationalProfile.mockReturnValue({
      saved: true,
      deviceId: 'device-1',
    });

    const response = controller.upsertEducationalProfile(
      { deviceId: 'device-1' },
      {
        knowledgeLevel: 'beginner',
        riskOrientation: 'moderate',
        investmentHorizon: 'medium',
        investorStyle: 'balanced',
        financialReadiness: 'caution',
        learningGoal: 'learn-basics',
        profileVersion: 2,
        completedAt: '2026-07-11T12:00:00.000Z',
      },
    );

    expect(response).toEqual({ saved: true, deviceId: 'device-1' });
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
  });
});
