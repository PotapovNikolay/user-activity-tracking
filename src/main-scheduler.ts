import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { SchedulerAppModule } from './scheduler-app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SchedulerAppModule, {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  logger.log('Scheduler application context started', 'SchedulerBootstrap');
}

void bootstrap();
