import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { createHttpValidationPipe } from './common/validation/http-validation.pipe';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const appConfig = app.get(AppConfigService);
  const logger = app.get(Logger);
  const port = appConfig.appPort;

  app.useLogger(logger);
  app.useGlobalPipes(createHttpValidationPipe());
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('User Activity Tracking API')
    .setDescription('REST API for user profiles and activity history')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  app.enableShutdownHooks();
  await app.listen(port);

  logger.log(`API is listening on port ${port}`, 'ApiBootstrap');
  logger.log('Swagger UI is available at /docs', 'ApiBootstrap');
}

void bootstrap();
