import { Module } from '@nestjs/common';
import { ActivityWorkerModule } from './modules/activity/activity-worker.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    LoggingModule,
    UsersModule,
    ActivityWorkerModule,
  ],
})
export class WorkerAppModule {}
