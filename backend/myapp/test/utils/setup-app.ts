import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';

/**
 * Builds an app instance with the same pipes/filters/interceptors as production.
 *
 * `configureModule` lets a spec override a provider (e.g. swapping
 * `ProviderAdapterFactory` for a test double at the Git-provider boundary,
 * since real GitHub/GitLab OAuth cannot run in CI) before the module compiles.
 */
export async function createTestApp(
  configureModule?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });
  if (configureModule) builder = configureModule(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ rawBody: true });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Constructed directly rather than via app.get() — Reflector has no
  // dependencies, and resolving providers before app.init() is unreliable.
  app.useGlobalInterceptors(new ResponseInterceptor(new Reflector()));
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}
