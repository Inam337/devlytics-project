import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
];

function getCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_CORS_ORIGINS;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Phase 0: allow Vite dev server (and preview) to call the API from the browser.
  // Production: set CORS_ORIGINS=https://your-frontend.example.com
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI (Swagger) JSON
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Zentro API')
    .setDescription('Zentro eCommerce backend API')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  // Expose the raw spec (Scalar can read this)
  app.use('/api.json', (_req, res) => res.json(document));

  // Scalar API Reference UI
  app.use(
    '/reference',
    apiReference({
      url: '/api.json',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
