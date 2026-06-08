import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger.config';

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn(),
  SwaggerModule: {
    createDocument: jest.fn(),
    setup: jest.fn(),
  },
}));

describe('setupSwagger', () => {
  it('should register the OpenAPI document and Swagger UI', () => {
    const builder = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ openapi: '3.0.0' }),
    };
    (DocumentBuilder as jest.Mock).mockImplementation(() => builder);

    const app = {} as INestApplication;
    const document = { paths: {} };
    (SwaggerModule.createDocument as jest.Mock).mockReturnValue(document);

    setupSwagger(app);

    expect(builder.setTitle).toHaveBeenCalledWith('Inversora API');
    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(app, {
      openapi: '3.0.0',
    });
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'api/docs',
      app,
      document,
    );
  });
});
