import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ActivityPublicService,
  ScheduleActivityGenerationCommand,
} from '../../activity.public';
import { ActivityGenerationPayload } from './activity-generation.payload';
import {
  ACTIVITY_GENERATION_JOB_NAME,
  USER_ACTIVITY_GENERATION_QUEUE,
} from './activity-queue.constants';

@Injectable()
export class ActivityJobsPublisher implements ActivityPublicService {
  constructor(
    @InjectQueue(USER_ACTIVITY_GENERATION_QUEUE)
    private readonly queue: Queue<ActivityGenerationPayload>,
  ) {}

  async scheduleGeneration(
    command: ScheduleActivityGenerationCommand,
  ): Promise<void> {
    const scheduledAtTimestamp = Date.parse(command.scheduledAt);

    await this.queue.add(ACTIVITY_GENERATION_JOB_NAME, command, {
      jobId: `${command.userId}-${scheduledAtTimestamp}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }
}
