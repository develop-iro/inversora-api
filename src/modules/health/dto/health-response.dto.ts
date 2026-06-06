import { ApiProperty } from '@nestjs/swagger';

/**
 * Response payload for the service health check endpoint.
 */
export class HealthResponseDto {
  @ApiProperty({
    description: 'Service health status.',
    example: 'ok',
    enum: ['ok'],
  })
  readonly status!: 'ok';
}
