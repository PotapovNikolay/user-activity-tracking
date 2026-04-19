import { NotFoundException } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { CreateGeneratedActivityUseCase } from '../../../../src/modules/activity/application/use-cases/create-generated-activity.use-case';
import { ActivityDeadLetterPayload } from '../../../../src/modules/activity/infrastructure/queue/activity-dead-letter.payload';
import {
  ActivityGenerationPayload,
  parseActivityGenerationPayload,
} from '../../../../src/modules/activity/infrastructure/queue/activity-generation.payload';
import { ActivityGenerationProcessor } from '../../../../src/modules/activity/infrastructure/queue/activity-generation.processor';
import {
  ACTIVITY_GENERATION_DEAD_LETTER_JOB_NAME,
  ACTIVITY_GENERATION_JOB_NAME,
  USER_ACTIVITY_GENERATION_QUEUE,
} from '../../../../src/modules/activity/infrastructure/queue/activity-queue.constants';

interface DeadLetterJobOptions {
  jobId: string;
}

const VALID_PAYLOAD: ActivityGenerationPayload = parseActivityGenerationPayload(
  {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    scheduledAt: '2026-04-17T12:00:00.000Z',
    activityType: 'running',
  },
);

function createMocks() {
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };
  const createGeneratedActivityUseCase = { execute: jest.fn() };
  const deadLetterQueue = { add: jest.fn() };
  return { logger, createGeneratedActivityUseCase, deadLetterQueue };
}

function createJob({
  id = 'job-1',
  name = ACTIVITY_GENERATION_JOB_NAME,
  data = VALID_PAYLOAD,
}: {
  id?: string;
  name?: string;
  data?: unknown;
} = {}): Job<unknown> {
  return { id, name, data } as Job<unknown>;
}

function getDeadLetterCall(
  deadLetterQueueAddMock: jest.Mock,
): [string, ActivityDeadLetterPayload, DeadLetterJobOptions] {
  return deadLetterQueueAddMock.mock.calls[0] as [
    string,
    ActivityDeadLetterPayload,
    DeadLetterJobOptions,
  ];
}

function expectDeadLetterEnqueued(
  mock: jest.Mock,
  expected: { originalJobId: string; reason: string | RegExp },
): void {
  const [jobName, payload, options] = getDeadLetterCall(mock);
  expect(jobName).toBe(ACTIVITY_GENERATION_DEAD_LETTER_JOB_NAME);
  expect(payload.originalJobId).toBe(expected.originalJobId);
  expect(payload.queueName).toBe(USER_ACTIVITY_GENERATION_QUEUE);
  expect(payload.jobName).toBe(ACTIVITY_GENERATION_JOB_NAME);
  if (expected.reason instanceof RegExp) {
    expect(payload.reason).toMatch(expected.reason);
  } else {
    expect(payload.reason).toBe(expected.reason);
  }
  expect(options.jobId).toContain(`${expected.originalJobId}-dead-letter-`);
}

describe('ActivityGenerationProcessor', () => {
  let mocks: ReturnType<typeof createMocks>;
  let processor: ActivityGenerationProcessor;

  beforeEach(() => {
    mocks = createMocks();
    mocks.deadLetterQueue.add.mockResolvedValue(undefined);
    processor = new ActivityGenerationProcessor(
      mocks.logger as unknown as PinoLogger,
      mocks.createGeneratedActivityUseCase as unknown as CreateGeneratedActivityUseCase,
      mocks.deadLetterQueue as never,
    );
  });

  it('logs error and rethrows retriable errors when activity creation fails', async () => {
    const retriableError = new Error('db failure');
    const job = createJob();

    mocks.createGeneratedActivityUseCase.execute.mockRejectedValue(
      retriableError,
    );

    await expect(processor.process(job)).rejects.toThrow(retriableError);

    expect(mocks.createGeneratedActivityUseCase.execute).toHaveBeenCalledWith({
      userId: VALID_PAYLOAD.userId,
      scheduledAt: new Date(VALID_PAYLOAD.scheduledAt),
      activityType: VALID_PAYLOAD.activityType,
    });
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: retriableError, jobId: job.id }),
      expect.stringContaining('Failed to process activity generation job'),
    );
  });

  it('logs and skips duplicate activity generation jobs without error', async () => {
    const job = createJob({ id: 'job-duplicate' });

    mocks.createGeneratedActivityUseCase.execute.mockResolvedValue(false);

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-duplicate',
        userId: VALID_PAYLOAD.userId,
      }),
      expect.stringContaining('Duplicate activity generation job skipped'),
    );
    expect(mocks.logger.info).not.toHaveBeenCalled();
  });

  it('drops invalid payload as UnrecoverableError without calling the use case', async () => {
    const job = createJob({
      id: 'job-2',
      data: {
        userId: 'not-a-uuid',
        scheduledAt: 'invalid-date',
        activityType: 'anything',
      },
    });

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );

    expect(mocks.createGeneratedActivityUseCase.execute).not.toHaveBeenCalled();

    expectDeadLetterEnqueued(mocks.deadLetterQueue.add, {
      originalJobId: 'job-2',
      reason: /Invalid activity generation payload/,
    });
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-2' }),
      expect.stringContaining('Invalid job payload'),
    );
  });

  it('drops NotFoundException as UnrecoverableError without retry', async () => {
    const job = createJob({ id: 'job-3' });

    mocks.createGeneratedActivityUseCase.execute.mockRejectedValue(
      new NotFoundException('User not found'),
    );

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );

    expectDeadLetterEnqueued(mocks.deadLetterQueue.add, {
      originalJobId: 'job-3',
      reason: 'User not found',
    });
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-3' }),
      expect.stringContaining('User not found'),
    );
    expect(mocks.logger.error).not.toHaveBeenCalled();
  });
});
