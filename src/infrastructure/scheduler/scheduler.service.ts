import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PinoLogger } from 'nestjs-pino';
import { utcNowIsoString } from '../../common/date/utc-date.util';
import { AppConfigService } from '../../config/app-config.service';
import { ACTIVITY_TYPES } from '../../modules/activity/activity.public';
import type {
  ActivityType,
  ActivityPublicService,
} from '../../modules/activity/activity.public';
import {
  ACTIVITY_PUBLIC_SERVICE,
  USERS_PUBLIC_SERVICE,
} from '../../shared/kernel/module-tokens';
import type { UsersPublicService } from '../../modules/users/users.public';

export const ACTIVITY_GENERATION_CRON_JOB_NAME =
  'user-activity-generation-cron';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly activityTypes: readonly ActivityType[] = ACTIVITY_TYPES;
  private readonly cronJobName = ACTIVITY_GENERATION_CRON_JOB_NAME;
  private isEnqueueRunning = false;

  constructor(
    private readonly logger: PinoLogger,
    private readonly appConfig: AppConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(USERS_PUBLIC_SERVICE)
    private readonly usersService: UsersPublicService,
    @Inject(ACTIVITY_PUBLIC_SERVICE)
    private readonly activityService: ActivityPublicService,
  ) {
    this.logger.setContext(SchedulerService.name);
  }

  onModuleInit(): void {
    const cronExpression = this.appConfig.schedulerCron;
    const cronJob = new CronJob(cronExpression, () => {
      void this.enqueueActivityJobs().catch(() => undefined);
    });

    this.schedulerRegistry.addCronJob(this.cronJobName, cronJob);
    cronJob.start();

    this.logger.info(
      {
        cronExpression,
        cronJobName: this.cronJobName,
      },
      'Scheduler cron job started',
    );
  }

  async onModuleDestroy(): Promise<void> {
    const cronJob = this.schedulerRegistry.getCronJob(this.cronJobName);
    await cronJob.stop();
    this.schedulerRegistry.deleteCronJob(this.cronJobName);
  }

  async enqueueActivityJobs(): Promise<void> {
    const runContext = this.startEnqueueRun();
    if (!runContext) {
      return;
    }

    try {
      this.logEnqueueRunStarted(runContext);
      const result = await this.enqueuePages(runContext);
      this.logEnqueueRunCompleted(result);
    } catch (error) {
      this.logEnqueueRunFailed(runContext, error);
      throw error;
    } finally {
      this.finishEnqueueRun();
    }
  }

  private pickActivityType(): ActivityType {
    const index = Math.floor(Math.random() * this.activityTypes.length);
    return this.activityTypes[index] ?? 'walking';
  }

  private startEnqueueRun(): EnqueueRunContext | null {
    if (this.isEnqueueRunning) {
      this.logger.warn(
        { cronJobName: this.cronJobName },
        'Skipping scheduler tick because the previous run is still in progress',
      );
      return null;
    }

    this.isEnqueueRunning = true;

    const scheduledAt = utcNowIsoString();

    return {
      runId: scheduledAt,
      scheduledAt,
      batchSize: this.appConfig.schedulerBatchSize,
      startedAt: Date.now(),
    };
  }

  private finishEnqueueRun(): void {
    this.isEnqueueRunning = false;
  }

  private async enqueuePages(
    runContext: EnqueueRunContext,
  ): Promise<EnqueueRunResult> {
    let cursor: Cursor | undefined;
    let enqueued = 0;
    let pageCount = 0;

    while (true) {
      const page = await this.usersService.findActiveUsersPage({
        limit: runContext.batchSize,
        after: cursor,
      });

      if (page.items.length === 0) {
        break;
      }

      pageCount += 1;
      enqueued += await this.enqueuePage(page.items, runContext.scheduledAt);

      this.logEnqueuedPage(runContext, {
        pageCount,
        enqueued,
        pageSize: page.items.length,
      });

      if (!page.nextCursor) {
        break;
      }

      cursor = page.nextCursor;
    }

    return {
      ...runContext,
      enqueued,
      pageCount,
      durationMs: Date.now() - runContext.startedAt,
    };
  }

  private async enqueuePage(
    users: ReadonlyArray<{ id: string }>,
    scheduledAt: string,
  ): Promise<number> {
    await Promise.all(
      users.map((user) =>
        this.activityService.scheduleGeneration({
          userId: user.id,
          scheduledAt,
          activityType: this.pickActivityType(),
        }),
      ),
    );

    return users.length;
  }

  private logEnqueueRunStarted(runContext: EnqueueRunContext): void {
    this.logger.info(
      {
        cronJobName: this.cronJobName,
        runId: runContext.runId,
        scheduledAt: runContext.scheduledAt,
        batchSize: runContext.batchSize,
      },
      'Starting paged activity job fan-out',
    );
  }

  private logEnqueuedPage(
    runContext: EnqueueRunContext,
    progress: EnqueueRunProgress,
  ): void {
    this.logger.debug(
      {
        cronJobName: this.cronJobName,
        runId: runContext.runId,
        scheduledAt: runContext.scheduledAt,
        pageCount: progress.pageCount,
        pageSize: progress.pageSize,
        enqueued: progress.enqueued,
      },
      'Enqueued page of activity generation jobs',
    );
  }

  private logEnqueueRunCompleted(result: EnqueueRunResult): void {
    this.logger.info(
      {
        cronJobName: this.cronJobName,
        runId: result.runId,
        scheduledAt: result.scheduledAt,
        batchSize: result.batchSize,
        pageCount: result.pageCount,
        enqueued: result.enqueued,
        durationMs: result.durationMs,
      },
      'Finished paged enqueueing of activity generation jobs',
    );
  }

  private logEnqueueRunFailed(
    runContext: EnqueueRunContext,
    error: unknown,
  ): void {
    this.logger.error(
      {
        err: error,
        cronJobName: this.cronJobName,
        runId: runContext.runId,
        scheduledAt: runContext.scheduledAt,
        batchSize: runContext.batchSize,
        durationMs: Date.now() - runContext.startedAt,
      },
      'Failed to enqueue activity generation jobs',
    );
  }
}

type Cursor = { createdAt: Date; id: string };

type EnqueueRunContext = {
  runId: string;
  scheduledAt: string;
  batchSize: number;
  startedAt: number;
};

type EnqueueRunProgress = {
  pageCount: number;
  pageSize: number;
  enqueued: number;
};

type EnqueueRunResult = EnqueueRunContext & {
  pageCount: number;
  enqueued: number;
  durationMs: number;
};
