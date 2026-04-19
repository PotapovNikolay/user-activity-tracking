import { randomUUID } from 'node:crypto';
import { ACTIVITY_GENERATION_JOB_NAME } from '../../src/modules/activity/infrastructure/queue/activity-queue.constants';
import type { ActivityGenerationPayload } from '../../src/modules/activity/infrastructure/queue/activity-generation.payload';
import { ActivityIntegrationHarness } from './support/activity-integration-harness';

describe('Activity failure modes integration', () => {
  const harness = new ActivityIntegrationHarness();

  beforeAll(async () => {
    await harness.init();
  }, 120000);

  afterAll(async () => {
    await harness.close();
  });

  it('marks invalid payload as failed without creating activity', async () => {
    const user = await harness.createUser('Integration Invalid Payload User');
    const invalidJobId = `invalid-payload-${randomUUID()}`;

    await harness.activityQueue.add(
      ACTIVITY_GENERATION_JOB_NAME,
      {
        userId: user.id,
        scheduledAt: 'not-a-date',
        activityType: 'sleeping',
      } as unknown as ActivityGenerationPayload,
      {
        jobId: invalidJobId,
      },
    );

    const failedJob = await harness.waitForValue(async () => {
      const job = await harness.activityQueue.getJob(invalidJobId);

      expect(job).toBeDefined();
      expect(await job?.getState()).toBe('failed');

      return job;
    });

    const activities = await harness.findActivities(user.id);
    const deadLetter = await harness.waitForValue(async () => {
      const dlqJob = await harness.findDeadLetterByOriginalJobId(invalidJobId);

      expect(dlqJob).toBeDefined();
      return dlqJob;
    });

    expect(activities).toHaveLength(0);
    expect(failedJob?.attemptsMade).toBe(1);
    expect(failedJob?.failedReason).toContain(
      'Invalid activity generation payload',
    );
    expect(deadLetter?.reason).toContain('Invalid activity generation payload');
  }, 120000);

  it('drops job for missing user without creating activity', async () => {
    const user = await harness.createUser('Integration Missing User');
    const missingUserId = user.id;
    const missingUserJobId = `missing-user-${randomUUID()}`;

    await harness.prisma.user.delete({
      where: { id: missingUserId },
    });

    await harness.activityQueue.add(
      ACTIVITY_GENERATION_JOB_NAME,
      {
        userId: missingUserId,
        scheduledAt: new Date().toISOString(),
        activityType: 'walking',
      },
      {
        jobId: missingUserJobId,
      },
    );

    const failedJob = await harness.waitForValue(async () => {
      const job = await harness.activityQueue.getJob(missingUserJobId);

      expect(job).toBeDefined();
      expect(await job?.getState()).toBe('failed');

      return job;
    });

    const activities = await harness.findActivities(missingUserId);
    const deadLetter = await harness.waitForValue(async () => {
      const dlqJob =
        await harness.findDeadLetterByOriginalJobId(missingUserJobId);

      expect(dlqJob).toBeDefined();
      return dlqJob;
    });

    expect(activities).toHaveLength(0);
    expect(failedJob?.attemptsMade).toBe(1);
    expect(failedJob?.failedReason).toContain('not found');
    expect(deadLetter?.reason).toContain('was not found');
  }, 120000);
});
