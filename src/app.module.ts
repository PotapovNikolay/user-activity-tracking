import { Module } from '@nestjs/common';
import { ActivityModule } from './modules/activity/activity.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    LoggingModule,
    HealthModule,
    UsersModule,
    ActivityModule,
  ],
})
export class AppModule {}
