import { Module } from '@nestjs/common';
import { CoreApiHttpClient } from './http-client';

/**
 * Cross-cutting HTTP client and response validation utilities for public API contracts.
 */
@Module({
  providers: [CoreApiHttpClient],
  exports: [CoreApiHttpClient],
})
export class CoreApiModule {}
