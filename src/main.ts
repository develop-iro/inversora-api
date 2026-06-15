import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './shared/config/config.service';
import { setupSwagger } from './shared/http/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  if (config.corsEnabled) {
    app.enableCors({
      origin: [...config.corsOrigins],
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept'],
    });
  }

  setupSwagger(app);

  await app.listen(config.port);
}

void bootstrap();
