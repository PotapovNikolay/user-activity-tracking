import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { NestFactory } from '@nestjs/core';
import { Queue } from 'bullmq';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { AppModule } from '../../../src/app.module';
import { createHttpValidationPipe } from '../../../src/common/validation/http-validation.pipe';
import { PrismaService } from '../../../src/database/prisma.service';
import { SchedulerService } from '../../../src/infrastructure/scheduler/scheduler.service';
import { ActivityDeadLetterPayload } from '../../../src/modules/activity/infrastructure/queue/activity-dead-letter.payload';
import { ActivityGenerationPayload } from '../../../src/modules/activity/infrastructure/queue/activity-generation.payload';
import {
  ACTIVITY_GENERATION_DEAD_LETTER_QUEUE,
  USER_ACTIVITY_GENERATION_QUEUE,
} from '../../../src/modules/activity/infrastructure/queue/activity-queue.constants';
import { SchedulerAppModule } from '../../../src/scheduler-app.module';
import { WorkerAppModule } from '../../../src/worker-app.module';

const TEST_DB_NAME = 'user_activity_tracking_test';
const TEST_DB_USER = 'app';
const TEST_DB_PASSWORD = 'app';

type ActivityQueue = Queue<ActivityGenerationPayload>;
type DeadLetterQueue = Queue<ActivityDeadLetterPayload>;

export class ActivityIntegrationHarness {
  apiApp!: INestApplication;
  workerApp!: INestApplicationContext;
  schedulerApp!: INestApplicationContext;
  prisma!: PrismaService;
  schedulerService!: SchedulerService;
  activityQueue!: ActivityQueue;
  deadLetterQueue!: DeadLetterQueue;

  private postgresContainer?: StartedTestContainer;
  private redisContainer?: StartedTestContainer;

  async init(): Promise<void> {
    await this.startContainers();
    configureTestEnvironment(this.postgresContainer!, this.redisContainer!);
    runPrismaMigrations();
    await this.bootstrapApps();
    this.resolveDependencies();
  }

  async close(): Promise<void> {
    await Promise.allSettled([
      this.schedulerApp?.close(),
      this.workerApp?.close(),
      this.apiApp?.close(),
    ]);
    await Promise.allSettled([
      this.redisContainer?.stop(),
      this.postgresContainer?.stop(),
    ]);
  }

  private async startContainers(): Promise<void> {
    this.postgresContainer = await startPostgresContainer();
    this.redisContainer = await startRedisContainer();
  }

  private async bootstrapApps(): Promise<void> {
    this.apiApp = await NestFactory.create(AppModule, { logger: false });
    this.apiApp.useGlobalPipes(createHttpValidationPipe());
    await this.apiApp.init();

    this.workerApp = await NestFactory.createApplicationContext(
      WorkerAppModule,
      { logger: false },
    );
    this.schedulerApp = await NestFactory.createApplicationContext(
      SchedulerAppModule,
      { logger: false },
    );
  }

  private resolveDependencies(): void {
    this.prisma = this.apiApp.get(PrismaService);
    this.schedulerService = this.schedulerApp.get(SchedulerService);
    this.activityQueue = this.schedulerApp.get<ActivityQueue>(
      getQueueToken(USER_ACTIVITY_GENERATION_QUEUE),
    );
    this.deadLetterQueue = this.schedulerApp.get<DeadLetterQueue>(
      getQueueToken(ACTIVITY_GENERATION_DEAD_LETTER_QUEUE),
    );
  }

  async createUser(name: string): Promise<{ id: string; email: string }> {
    return this.prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        name,
        timezone: 'UTC',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  async findActivities(userId: string) {
    return this.prisma.activity.findMany({
      where: { userId },
    });
  }

  async findDeadLetterByOriginalJobId(
    originalJobId: string,
  ): Promise<ActivityDeadLetterPayload | undefined> {
    const jobs = await this.deadLetterQueue.getJobs(['wait']);

    return jobs
      .map((job) => job.data)
      .find((payload) => payload.originalJobId === originalJobId);
  }

  async waitFor(
    assertion: () => Promise<void>,
    timeoutMs = 15000,
    intervalMs = 250,
  ): Promise<void> {
    await this.waitForValue(assertion, timeoutMs, intervalMs);
  }

  async waitForValue<T>(
    operation: () => Promise<T>,
    timeoutMs = 15000,
    intervalMs = 250,
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        return await operation();
      } catch {
        await delay(intervalMs);
      }
    }

    return operation();
  }
}

function startPostgresContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: TEST_DB_NAME,
      POSTGRES_USER: TEST_DB_USER,
      POSTGRES_PASSWORD: TEST_DB_PASSWORD,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage('database system is ready to accept connections'),
    )
    .start();
}

function startRedisContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();
}

function configureTestEnvironment(
  postgres: StartedTestContainer,
  redis: StartedTestContainer,
): void {
  const postgresHost = postgres.getHost();
  const postgresPort = postgres.getMappedPort(5432);

  process.env.NODE_ENV = 'test';
  process.env.APP_PORT = '0';
  process.env.LOG_LEVEL = 'silent';
  process.env.POSTGRES_DB = TEST_DB_NAME;
  process.env.POSTGRES_USER = TEST_DB_USER;
  process.env.POSTGRES_PASSWORD = TEST_DB_PASSWORD;
  process.env.DATABASE_URL = `postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${postgresHost}:${postgresPort}/${TEST_DB_NAME}?schema=public`;
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getMappedPort(6379));
  process.env.SCHEDULER_CRON = '0 0 1 1 *';
  process.env.SCHEDULER_BATCH_SIZE = '50';
}

function runPrismaMigrations(): void {
  const repoRoot = path.resolve(__dirname, '../../..');
  const prismaCliEntrypoint = path.resolve(
    repoRoot,
    'node_modules',
    'prisma',
    'build',
    'index.js',
  );

  execFileSync(process.execPath, [prismaCliEntrypoint, 'migrate', 'deploy'], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'pipe',
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
