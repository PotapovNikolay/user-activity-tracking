import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { CreateGeneratedActivityUseCase } from '../../application/use-cases/create-generated-activity.use-case';
import { ActivityDeadLetterPayload } from './activity-dead-letter.payload';
import { toGeneratedActivityCommand } from './activity-generation-payload.mapper';
import {
  ActivityGenerationPayload,
  parseActivityGenerationPayload,
} from './activity-generation.payload';
import {
  ACTIVITY_GENERATION_DEAD_LETTER_JOB_NAME,
  ACTIVITY_GENERATION_DEAD_LETTER_QUEUE,
  ACTIVITY_GENERATION_JOB_NAME,
  USER_ACTIVITY_GENERATION_QUEUE,
} from './activity-queue.constants';

@Processor(USER_ACTIVITY_GENERATION_QUEUE)
export class ActivityGenerationProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly createGeneratedActivityUseCase: CreateGeneratedActivityUseCase,
    @InjectQueue(ACTIVITY_GENERATION_DEAD_LETTER_QUEUE)
    private readonly deadLetterQueue: Queue<ActivityDeadLetterPayload>,
  ) {
    super();
    this.logger.setContext(ActivityGenerationProcessor.name);
  }

  async process(job: Job<unknown>): Promise<void> {
    if (job.name !== ACTIVITY_GENERATION_JOB_NAME) {
      this.logUnsupportedJob(job);
      return;
    }

    const payload = await this.parsePayloadOrDrop(job);

    try {
      await this.processGenerationJob(job, payload);
    } catch (error) {
      await this.handleProcessingError(job, payload, error);
    }
  }

  private logUnsupportedJob(job: Job<unknown>): void {
    this.logger.warn(
      { jobId: job.id, jobName: job.name },
      'Skipping unsupported job type - dropping without retry',
    );
  }

  private async parsePayloadOrDrop(
    job: Job<unknown>,
  ): Promise<ActivityGenerationPayload> {
    try {
      return parseActivityGenerationPayload(job.data);
    } catch (error) {
      await this.sendToDeadLetterQueue(
        job,
        error instanceof Error ? error.message : 'Invalid payload',
      );
      this.logger.warn(
        { err: error, jobId: job.id, ...extractJobMeta(job.data) },
        'Invalid job payload - dropping without retry',
      );
      throw new UnrecoverableError(
        error instanceof Error ? error.message : 'Invalid payload',
      );
    }
  }

  private async processGenerationJob(
    job: Job<unknown>,
    payload: ActivityGenerationPayload,
  ): Promise<void> {
    const created = await this.createGeneratedActivityUseCase.execute(
      toGeneratedActivityCommand(payload),
    );

    if (created) {
      this.logProcessedJob(job, payload);
      return;
    }

    this.logDuplicateJob(job, payload);
  }

  private logProcessedJob(
    job: Job<unknown>,
    payload: ActivityGenerationPayload,
  ): void {
    this.logger.info(
      {
        jobId: job.id,
        userId: payload.userId,
        activityType: payload.activityType,
      },
      'Processed activity generation job',
    );
  }

  private logDuplicateJob(
    job: Job<unknown>,
    payload: ActivityGenerationPayload,
  ): void {
    this.logger.warn(
      {
        jobId: job.id,
        userId: payload.userId,
        activityType: payload.activityType,
      },
      'Duplicate activity generation job skipped',
    );
  }

  private async handleProcessingError(
    job: Job<unknown>,
    payload: ActivityGenerationPayload,
    error: unknown,
  ): Promise<never> {
    if (error instanceof NotFoundException) {
      await this.handleMissingUser(job, payload, error);
    }

    this.logger.error(
      { err: error, jobId: job.id, ...extractJobMeta(job.data) },
      'Failed to process activity generation job - will retry',
    );
    throw error;
  }

  private async handleMissingUser(
    job: Job<unknown>,
    payload: ActivityGenerationPayload,
    error: NotFoundException,
  ): Promise<never> {
    await this.sendToDeadLetterQueue(job, error.message);
    this.logger.warn(
      { jobId: job.id, userId: payload.userId },
      'User not found - skipping job without retry',
    );
    throw new UnrecoverableError(
      `User ${payload.userId} not found - job dropped`,
    );
  }

  private async sendToDeadLetterQueue(
    job: Job<unknown>,
    reason: string,
  ): Promise<void> {
    await this.deadLetterQueue.add(
      ACTIVITY_GENERATION_DEAD_LETTER_JOB_NAME,
      {
        queueName: USER_ACTIVITY_GENERATION_QUEUE,
        jobName: job.name,
        originalJobId: String(job.id),
        reason,
        payload: job.data,
        failedAt: new Date().toISOString(),
      },
      {
        jobId: `${String(job.id)}-dead-letter-${Date.now()}`,
      },
    );
  }
}

function extractJobMeta(data: unknown): {
  userId?: string;
  activityType?: string;
} {
  if (data && typeof data === 'object') {
    return {
      userId: 'userId' in data ? String(data.userId) : undefined,
      activityType:
        'activityType' in data ? String(data.activityType) : undefined,
    };
  }

  return {};
}
