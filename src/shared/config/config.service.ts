import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Provides typed access to validated environment variables.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  /** HTTP server port. */
  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  /** Application runtime environment. */
  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  /** PostgreSQL username. */
  get postgresUser(): string {
    return this.configService.get('POSTGRES_USER', { infer: true });
  }

  /** PostgreSQL password. */
  get postgresPassword(): string {
    return this.configService.get('POSTGRES_PASSWORD', { infer: true });
  }

  /** PostgreSQL database name. */
  get postgresDb(): string {
    return this.configService.get('POSTGRES_DB', { infer: true });
  }

  /** PostgreSQL host. */
  get postgresHost(): string {
    return this.configService.get('POSTGRES_HOST', { infer: true });
  }

  /** PostgreSQL port. */
  get postgresPort(): number {
    return this.configService.get('POSTGRES_PORT', { infer: true });
  }

  /** Prisma database connection string. */
  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  /** Whether the application runs in production mode. */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
