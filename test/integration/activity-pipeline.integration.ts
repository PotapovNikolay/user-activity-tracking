import request from 'supertest';
import { ActivityIntegrationHarness } from './support/activity-integration-harness';

interface ActivityApiItem {
  source: string;
  type: string;
}

interface ActivityApiResponse {
  userId: string;
  items: ActivityApiItem[];
}

describe('Activity pipeline integration', () => {
  const harness = new ActivityIntegrationHarness();

  beforeAll(async () => {
    await harness.init();
  }, 120000);

  afterAll(async () => {
    await harness.close();
  });

  it('processes scheduler -> queue -> worker -> database -> api', async () => {
    const user = await harness.createUser('Integration Test User');
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await harness.schedulerService.enqueueActivityJobs();

    await harness.waitFor(async () => {
      const activities = await harness.findActivities(user.id);
      expect(activities).toHaveLength(1);
    });

    const server = harness.apiApp.getHttpServer() as Parameters<
      typeof request
    >[0];
    const response = await request(server)
      .get(
        `/users/${user.id}/activity?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
      .expect(200);

    const body = response.body as ActivityApiResponse;
    const [item] = body.items;

    expect(body.userId).toBe(user.id);
    expect(body.items).toHaveLength(1);
    expect(item).toBeDefined();
    expect(item?.source).toBe('system');
    expect(item?.type).toMatch(/^(walking|running|workout)$/);
  }, 120000);
});
