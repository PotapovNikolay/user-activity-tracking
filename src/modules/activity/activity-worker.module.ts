import { Module } from '@nestjs/common';
import { ActivityModule } from './activity.module';
import { ActivityQueueModule } from './activity-queue.module';
import { ActivityGenerationProcessor } from './infrastructure/queue/activity-generation.processor';

@Module({
  imports: [ActivityModule, ActivityQueueModule],
  providers: [ActivityGenerationProcessor],
})
export class ActivityWorkerModule {}
