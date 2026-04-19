import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { ACTIVITY_PUBLIC_SERVICE } from '../../shared/kernel/module-tokens';
import { ActivityJobsPublisher } from './infrastructure/queue/activity-jobs.publisher';
import {
  ACTIVITY_GENERATION_DEAD_LETTER_QUEUE,
  USER_ACTIVITY_GENERATION_QUEUE,
} from './infrastructure/queue/activity-queue.constants';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue(
      {
        name: USER_ACTIVITY_GENERATION_QUEUE,
      },
      {
        name: ACTIVITY_GENERATION_DEAD_LETTER_QUEUE,
      },
    ),
  ],
  providers: [
    ActivityJobsPublisher,
    {
      provide: ACTIVITY_PUBLIC_SERVICE,
      useExisting: ActivityJobsPublisher,
    },
  ],
  exports: [BullModule, ACTIVITY_PUBLIC_SERVICE],
})
export class ActivityQueueModule {}
