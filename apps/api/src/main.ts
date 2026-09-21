import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('port') ?? 4000;
  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1';
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  const nodeEnv = config.get<string>('nodeEnv') ?? 'development';

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger is a development tool; the API structure is not published in production.
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Afaq Invest API')
      .setDescription('Investment management platform API for Afaq Al Barakha Investment')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);

  console.log(`Afaq Invest API  →  http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger docs     →  http://localhost:${port}/docs`);
  }
}

await bootstrap();
