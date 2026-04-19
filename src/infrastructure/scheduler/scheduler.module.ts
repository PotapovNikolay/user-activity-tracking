import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from '../../config/app-config.module';
import { ActivityQueueModule } from '../../modules/activity/activity-queue.module';
import { UsersModule } from '../../modules/users/users.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    UsersModule,
    ActivityQueueModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
