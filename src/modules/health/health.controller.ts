import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  readonly status: 'ok';
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
    };
  }
}
