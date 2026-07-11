import './instrument';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfigService } from './shared/config/config.service';
import { buildNestCorsOptions } from './shared/http/cors.config';
import { GlobalHttpExceptionFilter } from './shared/http/http-exception.filter';
import { buildHelmetMiddleware } from './shared/http/security-headers.config';
import { setupSwagger } from './shared/http/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfigService);

  if (config.appEnv !== 'local') {
    app.set('trust proxy', 1);
  }

  app.use(buildHelmetMiddleware(config));
  app.useGlobalFilters(new GlobalHttpExceptionFilter(config));

  if (config.corsEnabled) {
    app.enableCors(buildNestCorsOptions(config.corsOrigins));
  }

  if (config.swaggerEnabled) {
    setupSwagger(app);
  }

  await app.listen(config.port);
}

void bootstrap();
