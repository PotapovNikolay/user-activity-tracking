import { randomUUID } from 'node:crypto';
import { ACTIVITY_GENERATION_JOB_NAME } from '../../src/modules/activity/infrastructure/queue/activity-queue.constants';
import type { ActivityGenerationPayload } from '../../src/modules/activity/infrastructure/queue/activity-generation.payload';
import { ActivityIntegrationHarness } from './support/activity-integration-harness';

describe('Activity idempotency integration', () => {
  const harness = new ActivityIntegrationHarness();

  beforeAll(async () => {
    await harness.init();
  }, 120000);

  afterAll(async () => {
    await harness.close();
  });

  it('stores only one activity record for duplicate payloads processed by worker', async () => {
    const user = await harness.createUser('Integration Idempotency User');
    const scheduledAt = new Date().toISOString();
    const duplicatePayload: ActivityGenerationPayload = {
      userId: user.id,
      scheduledAt,
      activityType: 'running',
    };

    await harness.activityQueue.add(
      ACTIVITY_GENERATION_JOB_NAME,
      duplicatePayload,
      {
        jobId: `duplicate-a-${randomUUID()}`,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    await harness.activityQueue.add(
      ACTIVITY_GENERATION_JOB_NAME,
      duplicatePayload,
      {
        jobId: `duplicate-b-${randomUUID()}`,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    await harness.waitFor(async () => {
      const activities = await harness.findActivities(user.id);
      expect(activities).toHaveLength(1);
    });

    const activities = await harness.findActivities(user.id);

    expect(activities).toHaveLength(1);
    expect(activities[0]?.endedAt.toISOString()).toBe(scheduledAt);
    expect(activities[0]?.type).toBe('running');
    expect(activities[0]?.source).toBe('system');
  }, 120000);
});
