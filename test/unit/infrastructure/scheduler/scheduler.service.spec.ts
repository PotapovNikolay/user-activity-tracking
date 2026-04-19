import { SchedulerRegistry } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../../../../src/config/app-config.service';
import {
  ACTIVITY_GENERATION_CRON_JOB_NAME,
  SchedulerService,
} from '../../../../src/infrastructure/scheduler/scheduler.service';
import {
  ActivityPublicService,
  ScheduleActivityGenerationCommand,
} from '../../../../src/modules/activity/activity.public';
import {
  ActiveUser,
  ActiveUsersPage,
  ActiveUsersPageQuery,
} from '../../../../src/modules/users/domain/active-user';
import { UsersPublicService } from '../../../../src/modules/users/users.public';

function makeActiveUser(
  overrides: Partial<ActiveUser> & Pick<ActiveUser, 'id'>,
): ActiveUser {
  return {
    email: `${overrides.id}@example.com`,
    timezone: 'UTC',
    isActive: true,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createMocks() {
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };
  const usersService = {
    findActiveUsersPage: jest.fn<
      Promise<ActiveUsersPage>,
      [ActiveUsersPageQuery]
    >(),
  };
  const activityService = {
    scheduleGeneration: jest.fn<
      Promise<void>,
      [ScheduleActivityGenerationCommand]
    >(),
  };
  return { logger, usersService, activityService };
}

describe('SchedulerService', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: SchedulerService;

  beforeEach(() => {
    mocks = createMocks();
    service = new SchedulerService(
      mocks.logger as unknown as PinoLogger,
      { schedulerCron: '* * * * *', schedulerBatchSize: 2 } as AppConfigService,
      {} as SchedulerRegistry,
      mocks.usersService as unknown as UsersPublicService,
      mocks.activityService as unknown as ActivityPublicService,
    );
  });

  it('pages through active users without loading the full set at once', async () => {
    const cursor = {
      id: 'user-2',
      createdAt: new Date('2026-04-01T00:01:00.000Z'),
    };

    mocks.usersService.findActiveUsersPage
      .mockResolvedValueOnce({
        items: [
          makeActiveUser({ id: 'user-1' }),
          makeActiveUser({ id: 'user-2', createdAt: cursor.createdAt }),
        ],
        nextCursor: cursor,
      })
      .mockResolvedValueOnce({
        items: [
          makeActiveUser({
            id: 'user-3',
            createdAt: new Date('2026-04-01T00:02:00.000Z'),
          }),
        ],
      });
    mocks.activityService.scheduleGeneration.mockResolvedValue(undefined);

    await service.enqueueActivityJobs();

    expect(mocks.usersService.findActiveUsersPage).toHaveBeenNthCalledWith(1, {
      limit: 2,
      after: undefined,
    });
    expect(mocks.usersService.findActiveUsersPage).toHaveBeenNthCalledWith(2, {
      limit: 2,
      after: cursor,
    });
    expect(mocks.activityService.scheduleGeneration).toHaveBeenCalledTimes(3);
  });

  it('skips overlapping scheduler ticks while the previous run is still executing', async () => {
    let resolvePage!: (value: ActiveUsersPage) => void;
    mocks.usersService.findActiveUsersPage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );

    const firstRun = service.enqueueActivityJobs();
    await Promise.resolve();
    await service.enqueueActivityJobs();

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        cronJobName: ACTIVITY_GENERATION_CRON_JOB_NAME,
      }),
      expect.stringContaining('previous run is still in progress'),
    );
    expect(mocks.usersService.findActiveUsersPage).toHaveBeenCalledTimes(1);

    resolvePage({ items: [] });
    await firstRun;
  });
});
