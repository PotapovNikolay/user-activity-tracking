import { Prisma } from '@prisma/client';
import { ActivityItem } from '../../../../src/modules/activity/domain/activity-item';
import { ActivityPeriod } from '../../../../src/modules/activity/domain/activity-period';
import { CreateActivityRecordCommand } from '../../../../src/modules/activity/domain/create-activity-record.command';
import { ActivityRepository } from '../../../../src/modules/activity/infrastructure/activity.repository';

const DEFAULT_FROM = new Date('2026-04-01T00:00:00.000Z');
const DEFAULT_TO = new Date('2026-04-17T23:59:59.999Z');
const DEFAULT_SCHEDULED_AT = new Date('2026-04-17T10:10:00.000Z');

type PersistedActivity = ActivityItem & { userId: string };

function createPeriod(overrides: Partial<ActivityPeriod> = {}): ActivityPeriod {
  return {
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
    limit: 50,
    ...overrides,
  };
}

function createActivityItem(
  overrides: Partial<ActivityItem> = {},
): ActivityItem {
  return {
    id: 'activity-1',
    type: 'running',
    source: 'system',
    startedAt: new Date('2026-04-17T09:30:00.000Z'),
    endedAt: new Date('2026-04-17T10:10:00.000Z'),
    durationSeconds: 2400,
    summary: null,
    createdAt: new Date('2026-04-17T10:10:00.000Z'),
    ...overrides,
  };
}

function createPersistedActivity(
  overrides: Partial<PersistedActivity> = {},
): PersistedActivity {
  return { userId: 'user-1', ...createActivityItem(overrides) };
}

function createActivityRecordCommand(
  overrides: Partial<CreateActivityRecordCommand> = {},
): CreateActivityRecordCommand {
  return {
    userId: 'user-1',
    type: 'running',
    source: 'system',
    startedAt: new Date('2026-04-17T09:30:00.000Z'),
    endedAt: DEFAULT_SCHEDULED_AT,
    durationSeconds: 2400,
    summary: { steps: 5300 } as Prisma.InputJsonObject,
    ...overrides,
  };
}

describe('ActivityRepository', () => {
  let repository: ActivityRepository;
  const findManyMock = jest.fn();
  const createManyMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ActivityRepository({
      activity: {
        findMany: findManyMock,
        createMany: createManyMock,
      },
    } as never);
  });

  it('uses createMany with skipDuplicates for idempotent inserts', async () => {
    const command = createActivityRecordCommand({ summary: { steps: 5300 } });

    createManyMock.mockResolvedValue({ count: 1 });

    await expect(repository.create(command)).resolves.toBe(true);

    expect(createManyMock).toHaveBeenCalledWith({
      data: command,
      skipDuplicates: true,
    });
  });

  it('builds overlap query, stable sort and take for the first page', async () => {
    const period = createPeriod({ limit: 2, type: 'running' });

    findManyMock.mockResolvedValue([
      createPersistedActivity({ summary: { steps: 5300 } }),
    ]);

    await repository.findByUserAndPeriod('user-1', period);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        startedAt: { lt: period.to },
        endedAt: { gt: period.from },
        type: 'running',
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
  });

  it('applies cursor paging and returns nextCursor', async () => {
    const cursorStartedAt = new Date('2026-04-17T09:30:00.000Z');

    findManyMock.mockResolvedValue([
      createPersistedActivity({
        id: '550e8400-e29b-41d4-a716-446655440001',
        startedAt: new Date('2026-04-17T09:29:00.000Z'),
        endedAt: new Date('2026-04-17T10:00:00.000Z'),
        durationSeconds: 1860,
        summary: { steps: 5000 },
        createdAt: new Date('2026-04-17T10:00:00.000Z'),
      }),
      createPersistedActivity({
        id: '550e8400-e29b-41d4-a716-446655440002',
        startedAt: new Date('2026-04-17T09:00:00.000Z'),
        endedAt: new Date('2026-04-17T09:30:00.000Z'),
        durationSeconds: 1800,
        summary: { steps: 4500 },
        createdAt: new Date('2026-04-17T09:30:00.000Z'),
      }),
      createPersistedActivity({
        id: '550e8400-e29b-41d4-a716-446655440003',
        startedAt: new Date('2026-04-17T08:30:00.000Z'),
        endedAt: new Date('2026-04-17T09:00:00.000Z'),
        durationSeconds: 1800,
        summary: { steps: 4000 },
        createdAt: new Date('2026-04-17T09:00:00.000Z'),
      }),
    ]);

    const page = await repository.findByUserAndPeriod(
      'user-1',
      createPeriod({
        limit: 2,
        cursor: {
          startedAt: cursorStartedAt,
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
      }),
    );

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            userId: 'user-1',
            startedAt: { lt: DEFAULT_TO },
            endedAt: { gt: DEFAULT_FROM },
          },
          {
            OR: [
              { startedAt: { lt: cursorStartedAt } },
              {
                AND: [
                  { startedAt: cursorStartedAt },
                  { id: { lt: '550e8400-e29b-41d4-a716-446655440000' } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toEqual({
      startedAt: new Date('2026-04-17T09:00:00.000Z'),
      id: '550e8400-e29b-41d4-a716-446655440002',
    });
  });
});
