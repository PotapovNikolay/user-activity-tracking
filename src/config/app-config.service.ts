import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogLevel, NodeEnv } from './env.validation';
import { RedisConfig } from './contracts/redis-config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): NodeEnv {
    return this.getOrThrow<NodeEnv>('nodeEnv');
  }

  get appPort(): number {
    return this.getOrThrow<number>('app.port');
  }

  get logLevel(): LogLevel {
    return this.getOrThrow<LogLevel>('app.logLevel');
  }

  get databaseUrl(): string {
    return this.getOrThrow<string>('database.url');
  }

  get redis(): RedisConfig {
    return {
      host: this.getOrThrow<string>('redis.host'),
      port: this.getOrThrow<number>('redis.port'),
    };
  }

  get schedulerCron(): string {
    return this.getOrThrow<string>('scheduler.cron');
  }

  get schedulerBatchSize(): number {
    return this.getOrThrow<number>('scheduler.batchSize');
  }

  get activityMaxPeriodDays(): number {
    return this.getOrThrow<number>('activity.maxPeriodDays');
  }

  private getOrThrow<T>(key: string): T {
    return this.configService.getOrThrow<T>(key);
  }
}
