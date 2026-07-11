import { Body, Controller, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentAnonymousDevice } from '../decorators/current-anonymous-device.decorator';
import { anonymousEducationalProfileSchema } from '../entities/anonymous-educational-profile.schema';
import {
  heartbeatAnonymousDeviceSchema,
  registerAnonymousDeviceSchema,
} from '../entities/register-device.schema';
import type { AnonymousDeviceRequestContext } from '../guards/device-token.guard';
import { DeviceTokenGuard } from '../guards/device-token.guard';
import { AnonymousDevicesService } from '../services/anonymous-devices.service';

@ApiTags('anonymous-devices')
@Controller('anonymous-devices')
export class AnonymousDevicesController {
  constructor(
    private readonly anonymousDevicesService: AnonymousDevicesService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register an anonymous mobile device installation' })
  @ApiCreatedResponse({ description: 'Device registered with opaque token.' })
  register(@Body() body: unknown) {
    const input = registerAnonymousDeviceSchema.parse(body);
    return this.anonymousDevicesService.registerDevice(input);
  }

  @Patch('me/heartbeat')
  @UseGuards(DeviceTokenGuard)
  @ApiOperation({ summary: 'Refresh anonymous device heartbeat metadata' })
  @ApiOkResponse({ description: 'Heartbeat accepted.' })
  heartbeat(
    @CurrentAnonymousDevice() device: AnonymousDeviceRequestContext,
    @Body() body: unknown,
  ) {
    const input = heartbeatAnonymousDeviceSchema.parse(body ?? {});
    return this.anonymousDevicesService.heartbeat(device.deviceId, input);
  }

  @Put('me/educational-profile')
  @UseGuards(DeviceTokenGuard)
  @ApiOperation({
    summary: 'Upsert derived educational profile for the current device',
  })
  @ApiOkResponse({ description: 'Educational profile saved.' })
  upsertEducationalProfile(
    @CurrentAnonymousDevice() device: AnonymousDeviceRequestContext,
    @Body() body: unknown,
  ) {
    const profile = anonymousEducationalProfileSchema.parse(body);
    return this.anonymousDevicesService.upsertEducationalProfile(
      device.deviceId,
      profile,
    );
  }
}
