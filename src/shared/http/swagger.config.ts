import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Registers the OpenAPI document and Swagger UI at `/api/docs`.
 *
 * @param app - Bootstrapped NestJS application instance.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Inversora API')
    .setDescription(
      'Backend API for Inversora, a mobile app to discover and analyze investment funds.',
    )
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);
}
