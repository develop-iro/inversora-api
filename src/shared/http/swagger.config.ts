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
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Admin-Api-Key',
        description:
          'Shared secret for manual admin sync (ADMIN_API_KEY). Bearer auth is also supported.',
      },
      'admin-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);
}
