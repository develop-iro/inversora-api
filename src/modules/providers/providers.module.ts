import { Module } from '@nestjs/common';
import { FinancialModelingPrepClient } from './financial-modeling-prep/financial-modeling-prep.client';
import { FinancialModelingPrepFixtureService } from './financial-modeling-prep/financial-modeling-prep.fixture.service';
import { FinancialModelingPrepProvider } from './financial-modeling-prep/financial-modeling-prep.provider';
import { MyInvestorMcpClient } from './myinvestor/myinvestor-mcp.client';
import { MyInvestorFixtureService } from './myinvestor/myinvestor.fixture.service';
import { MyInvestorProvider } from './myinvestor/myinvestor.provider';

/**
 * Module that exposes external data providers used by domain modules.
 */
@Module({
  providers: [
    FinancialModelingPrepFixtureService,
    FinancialModelingPrepClient,
    FinancialModelingPrepProvider,
    MyInvestorFixtureService,
    MyInvestorMcpClient,
    MyInvestorProvider,
  ],
  exports: [FinancialModelingPrepProvider, MyInvestorProvider],
})
export class ProvidersModule {}
