import { Module } from '@nestjs/common';
import { FinancialModelingPrepClient } from './financial-modeling-prep/financial-modeling-prep.client';
import { FinancialModelingPrepFixtureService } from './financial-modeling-prep/financial-modeling-prep.fixture.service';
import { FinancialModelingPrepProvider } from './financial-modeling-prep/financial-modeling-prep.provider';

/**
 * Module that exposes external data providers used by domain modules.
 */
@Module({
  providers: [
    FinancialModelingPrepFixtureService,
    FinancialModelingPrepClient,
    FinancialModelingPrepProvider,
  ],
  exports: [FinancialModelingPrepProvider],
})
export class ProvidersModule {}
