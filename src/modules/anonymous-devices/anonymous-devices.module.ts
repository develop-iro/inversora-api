import { Module } from '@nestjs/common';

import { AnonymousDevicesController } from './controllers/anonymous-devices.controller';
import { DeviceTokenGuard } from './guards/device-token.guard';
import { AnonymousDevicesRepository } from './repositories/anonymous-devices.repository';
import { AnonymousDevicesService } from './services/anonymous-devices.service';

@Module({
  controllers: [AnonymousDevicesController],
  providers: [
    AnonymousDevicesService,
    AnonymousDevicesRepository,
    DeviceTokenGuard,
  ],
  exports: [AnonymousDevicesService, AnonymousDevicesRepository],
})
export class AnonymousDevicesModule {}
