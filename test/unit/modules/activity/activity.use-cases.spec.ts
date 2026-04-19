import { NotFoundException } from '@nestjs/common';
import { ActivityUserPreconditionsService } from '../../../../src/modules/activity/application/services/activity-user-preconditions.service';
import { CreateGeneratedActivityUseCase } from '../../../../src/modules/activity/application/use-cases/create-generated-activity.use-case';
import { GetUserActivityUseCase } from '../../../../src/modules/activity/application/use-cases/get-user-activity.use-case';
import { ActivityItem } from '../../../../src/modules/activity/domain/activity-item';
import { ActivityPeriod } from '../../../../src/modules/activity/domain/activity-period';
import { ActivityRepository } from '../../../../src/modules/activity/infrastructure/activity.repository';
import { UsersPublicService } from '../../../../src/modules/users/users.public';

const DEFAULT_FROM = new Date('2026-04-01T00:00:00.000Z');
const DEFAULT_TO = new Date('2026-04-17T23:59:59.999Z');
const DEFAULT_SCHEDULED_AT = new Date('2026-04-17T10:10:00.000Z');

function createPreconditions() {
  const ensureExistsMock = jest.fn();
  const service = new ActivityUserPreconditionsService({
    ensureExists: ensureExistsMock,
  } as unknown as UsersPublicService);
  return { ensureExistsMock, service };
}

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

describe('GetUserActivityUseCase', () => {
  let getUserActivityUseCase: GetUserActivityUseCase;
  const findByUserAndPeriodMock = jest.fn();
  let ensureExistsMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const preconditions = createPreconditions();
    ensureExistsMock = preconditions.ensureExistsMock;

    getUserActivityUseCase = new GetUserActivityUseCase(
      {
        findByUserAndPeriod: findByUserAndPeriodMock,
      } as unknown as ActivityRepository,
      preconditions.service,
    );
  });

  it('returns paged activity and preserves filters', async () => {
    const period = createPeriod({ limit: 50, type: 'running' });
    const expectedPage = {
      items: [createActivityItem({ summary: { steps: 5300 } })],
      nextCursor: undefined,
    };

    ensureExistsMock.mockResolvedValue(undefined);
    findByUserAndPeriodMock.mockResolvedValue(expectedPage);

    const page = await getUserActivityUseCase.execute('user-1', period);

    expect(ensureExistsMock).toHaveBeenCalledWith('user-1');
    expect(findByUserAndPeriodMock).toHaveBeenCalledWith('user-1', period);
    expect(page).toEqual(expectedPage);
  });

  it('omits type filter when not provided', async () => {
    ensureExistsMock.mockResolvedValue(undefined);
    findByUserAndPeriodMock.mockResolvedValue({
      items: [],
      nextCursor: undefined,
    });

    await getUserActivityUseCase.execute(
      'user-1',
      createPeriod({ to: new Date('2026-04-17T00:00:00.000Z'), limit: 25 }),
    );

    const [, periodArg] = findByUserAndPeriodMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(periodArg).not.toHaveProperty('type');
    expect(periodArg).toHaveProperty('limit', 25);
  });

  it('preserves JSON values in summary', async () => {
    ensureExistsMock.mockResolvedValue(undefined);
    findByUserAndPeriodMock.mockResolvedValue({
      items: [createActivityItem({ summary: ['split-1', 'split-2'] })],
      nextCursor: undefined,
    });

    const page = await getUserActivityUseCase.execute(
      'user-1',
      createPeriod({ to: new Date('2026-04-17T00:00:00.000Z'), limit: 50 }),
    );

    expect(page.items[0]?.summary).toEqual(['split-1', 'split-2']);
  });

  it('propagates NotFoundException when user does not exist', async () => {
    ensureExistsMock.mockRejectedValue(new NotFoundException('nope'));

    await expect(
      getUserActivityUseCase.execute(
        'missing',
        createPeriod({ to: new Date('2026-04-17T00:00:00.000Z'), limit: 50 }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findByUserAndPeriodMock).not.toHaveBeenCalled();
  });
});

describe('CreateGeneratedActivityUseCase', () => {
  let createGeneratedActivityUseCase: CreateGeneratedActivityUseCase;
  const createMock = jest.fn();
  let ensureExistsMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const preconditions = createPreconditions();
    ensureExistsMock = preconditions.ensureExistsMock;

    createGeneratedActivityUseCase = new CreateGeneratedActivityUseCase(
      { create: createMock } as unknown as ActivityRepository,
      preconditions.service,
    );
  });

  it('creates generated activity with summary object payload', async () => {
    ensureExistsMock.mockResolvedValue(undefined);
    createMock.mockResolvedValue(true);

    await expect(
      createGeneratedActivityUseCase.execute({
        userId: 'user-1',
        activityType: 'running',
        scheduledAt: DEFAULT_SCHEDULED_AT,
      }),
    ).resolves.toBe(true);

    expect(ensureExistsMock).toHaveBeenCalledWith('user-1');

    const [createArg] = createMock.mock.calls[0] as [
      {
        userId: string;
        type: string;
        source: string;
        startedAt: Date;
        endedAt: Date;
        durationSeconds: number;
        summary: unknown;
      },
    ];

    expect(createArg).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        type: 'running',
        source: 'system',
        endedAt: DEFAULT_SCHEDULED_AT,
      }),
    );
    expect(createArg.startedAt).toBeInstanceOf(Date);
    expect(createArg.durationSeconds).toEqual(expect.any(Number));
    expect(createArg.summary).toEqual(expect.any(Object));
  });

  it('returns false when generated activity is skipped as duplicate', async () => {
    ensureExistsMock.mockResolvedValue(undefined);
    createMock.mockResolvedValue(false);

    await expect(
      createGeneratedActivityUseCase.execute({
        userId: 'user-1',
        activityType: 'running',
        scheduledAt: DEFAULT_SCHEDULED_AT,
      }),
    ).resolves.toBe(false);
  });
});
