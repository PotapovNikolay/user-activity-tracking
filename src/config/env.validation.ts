import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  validateSync,
  ValidationError,
} from 'class-validator';
import { ENV_KEYS } from './env.constants';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
  Silent = 'silent',
}

export class EnvVariables {
  @IsEnum(NodeEnv)
  [ENV_KEYS.NODE_ENV]: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  [ENV_KEYS.APP_PORT] = 3000;

  @IsEnum(LogLevel)
  [ENV_KEYS.LOG_LEVEL]: LogLevel = LogLevel.Info;

  @IsString()
  [ENV_KEYS.DATABASE_URL] =
    'postgresql://app:app@localhost:5432/user_activity_tracking?schema=public';

  @IsString()
  [ENV_KEYS.POSTGRES_DB] = 'user_activity_tracking';

  @IsString()
  [ENV_KEYS.POSTGRES_USER] = 'app';

  @IsString()
  [ENV_KEYS.POSTGRES_PASSWORD] = 'app';

  @IsString()
  [ENV_KEYS.REDIS_HOST] = 'localhost';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  [ENV_KEYS.REDIS_PORT] = 6379;

  @IsString()
  [ENV_KEYS.SCHEDULER_CRON] = '* * * * *';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  [ENV_KEYS.SCHEDULER_BATCH_SIZE] = 50;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  [ENV_KEYS.ACTIVITY_MAX_PERIOD_DAYS] = 31;
}

export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const env = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(env, {
    skipMissingProperties: false,
    validationError: {
      target: false,
      value: true,
    },
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${formatValidationErrors(errors).join(', ')}`,
    );
  }

  syncValidatedEnvToProcessEnv(env);
  return env;
}

function syncValidatedEnvToProcessEnv(env: EnvVariables): void {
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = String(value);
  }
}

function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const ownMessages = Object.values(error.constraints ?? {}).map(
      (message) => `${error.property}: ${message}`,
    );
    const nestedMessages = formatValidationErrors(error.children ?? []);

    return [...ownMessages, ...nestedMessages];
  });
}
