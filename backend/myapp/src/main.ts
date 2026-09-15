import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import helmet from 'helmet';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('app.apiPrefix', 'api/v1');
  const port = config.get<number>('app.port', 3000);
  const corsOrigins = config.get<string[]>('app.corsOrigins', []);

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : DEFAULT_CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256', 'X-Gitlab-Token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Devlytics API')
    .setDescription(
      'Devlytics engineering intelligence API — organizations, teams, Git integration, ' +
        'engineering metrics, code quality, scoring, rankings, AI analysis and improvement goals.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addServer(`/${apiPrefix}`, 'Devlytics API')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: true,
  });
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  app.use(`/${apiPrefix}/openapi.json`, (_req: Request, res: Response) => res.json(document));
  app.use(`/${apiPrefix}/reference`, apiReference({ url: `/${apiPrefix}/openapi.json` }));

  await app.listen(port, '0.0.0.0');
  logger.log(`Devlytics API listening on http://localhost:${port}/${apiPrefix}`);
  logger.log(`OpenAPI docs at http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
