import { Injectable, Logger } from '@nestjs/common';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { AppConfigService } from '../../../shared/config/config.service';
import { CURATED_NON_US_SYNC_SYMBOLS } from '../config/sync-universe.config';
import { dedupeSymbols } from '../utils/fund-listing.utils';

/** Options for resolving the symbol universe of a synchronization run. */
export interface FundDiscoveryOptions {
  /** Explicit symbol override from admin API or CLI. */
  readonly explicitSymbols?: readonly string[];
  /** When true, merges FMP `etf-list` symbols. */
  readonly discover?: boolean;
  /** Overrides {@link AppConfigService.syncDiscoveryLimit}. */
  readonly discoveryLimit?: number;
  /** Overrides {@link AppConfigService.syncDiscoveryOffset}. */
  readonly discoveryOffset?: number;
  /** Overrides {@link AppConfigService.syncDiscoveryMode}. */
  readonly discoveryMode?: 'all' | 'indexed';
}

/**
 * Resolves which fund symbols a sync run should process.
 *
 * Combines env-configured symbols, curated non-US UCITS, and optional FMP
 * `etf-list` discovery.
 */
@Injectable()
export class FundDiscoveryService {
  private readonly logger = new Logger(FundDiscoveryService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly fmpProvider: FinancialModelingPrepProvider,
  ) {}

  /**
   * Builds the deduplicated symbol list for a sync run.
   *
   * @param options - Discovery and override flags.
   * @returns Uppercase symbols, or an empty array to fall back to persisted funds.
   */
  async resolveSyncSymbols(
    options: FundDiscoveryOptions = {},
  ): Promise<string[]> {
    const discovered = await this.loadDiscoveredSymbols(options);
    const configured = [...this.config.syncFundSymbols];
    const explicit = options.explicitSymbols ?? [];

    if (explicit.length > 0) {
      return dedupeSymbols(explicit);
    }

    const merged = dedupeSymbols([...configured, ...discovered]);

    if (discovered.length > 0) {
      const universe = dedupeSymbols([
        ...merged,
        ...CURATED_NON_US_SYNC_SYMBOLS,
      ]);

      this.logger.log(
        `Resolved sync universe: ${universe.length} symbols (${discovered.length} from etf-list [${options.discoveryMode ?? this.config.syncDiscoveryMode}], ${CURATED_NON_US_SYNC_SYMBOLS.length} curated non-US)`,
      );

      return universe;
    }

    if (merged.length > 0) {
      this.logger.log(`Resolved sync universe: ${merged.length} symbols`);

      return merged;
    }

    return [];
  }

  private async loadDiscoveredSymbols(
    options: FundDiscoveryOptions,
  ): Promise<string[]> {
    const shouldDiscover =
      options.discover ?? this.config.syncEtfListDiscoveryEnabled;

    if (!shouldDiscover) {
      return [];
    }

    const limit = options.discoveryLimit ?? this.config.syncDiscoveryLimit;
    const offset = options.discoveryOffset ?? this.config.syncDiscoveryOffset;
    const mode = options.discoveryMode ?? this.config.syncDiscoveryMode;

    return this.fmpProvider.listEtfCatalogSymbols({ mode, offset, limit });
  }
}
