import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FundsRepository } from '../modules/funds/repositories/funds.repository';
import { resolveFundThemeSyncFields } from '../modules/funds/entities/fund-theme.sync';
import {
  INVESTMENT_THEME_LABELS,
  type InvestmentTheme,
} from '../modules/funds/entities/investment-theme.schema';
import { isCatalogVisible } from '../modules/funds/entities/catalog-visibility.schema';

const logger = new Logger('RunFundThemeBackfillCli');

type ThemeDistribution = Record<InvestmentTheme, number>;

/**
 * Backfills investment themes for all persisted funds and prints distribution stats.
 */
async function runFundThemeBackfillCli(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fundsRepository = app.get(FundsRepository);
    const funds = await fundsRepository.findAll();
    const distribution = Object.fromEntries(
      Object.keys(INVESTMENT_THEME_LABELS).map((theme) => [theme, 0]),
    ) as ThemeDistribution;
    const visibleDistribution = { ...distribution };
    let updated = 0;
    let themeLabelsFilled = 0;

    for (const fund of funds) {
      const themeFields = resolveFundThemeSyncFields(
        {
          name: fund.name,
          benchmark: fund.benchmark,
          assetClass: fund.assetClass,
        },
        fund.editorial.themeLabel,
      );
      const shouldFillThemeLabel =
        fund.editorial.themeLabel.trim().length === 0;
      const themeChanged = fund.investmentTheme !== themeFields.investmentTheme;

      distribution[themeFields.investmentTheme] += 1;

      if (isCatalogVisible(fund)) {
        visibleDistribution[themeFields.investmentTheme] += 1;
      }

      if (!themeChanged && !shouldFillThemeLabel) {
        continue;
      }

      if (!dryRun) {
        await fundsRepository.applyInvestmentTheme(fund.id, {
          investmentTheme: themeFields.investmentTheme,
          themeLabel: shouldFillThemeLabel ? themeFields.themeLabel : undefined,
        });
      }

      updated += 1;

      if (shouldFillThemeLabel) {
        themeLabelsFilled += 1;
      }
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          dryRun,
          total: funds.length,
          updated,
          themeLabelsFilled,
          distribution,
          visibleDistribution,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Fund theme backfill failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void runFundThemeBackfillCli();
