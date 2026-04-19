import { ENV_KEYS, type EnvKey } from './env.constants';

export default () => ({
  nodeEnv: getRequiredEnv(ENV_KEYS.NODE_ENV),
  app: {
    port: getRequiredIntEnv(ENV_KEYS.APP_PORT),
    logLevel: getRequiredEnv(ENV_KEYS.LOG_LEVEL),
  },
  database: {
    url: getRequiredEnv(ENV_KEYS.DATABASE_URL),
  },
  redis: {
    host: getRequiredEnv(ENV_KEYS.REDIS_HOST),
    port: getRequiredIntEnv(ENV_KEYS.REDIS_PORT),
  },
  scheduler: {
    cron: getRequiredEnv(ENV_KEYS.SCHEDULER_CRON),
    batchSize: getRequiredIntEnv(ENV_KEYS.SCHEDULER_BATCH_SIZE),
  },
  activity: {
    maxPeriodDays: getRequiredIntEnv(ENV_KEYS.ACTIVITY_MAX_PERIOD_DAYS),
  },
});

function getRequiredEnv(key: EnvKey): string {
  const value = process.env[key];

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getRequiredIntEnv(key: EnvKey): number {
  return Number.parseInt(getRequiredEnv(key), 10);
}
