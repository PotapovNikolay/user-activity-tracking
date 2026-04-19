import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    this.redis = new Redis({
      host: this.appConfig.redis.host,
      port: this.appConfig.redis.port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }

      const response = await this.redis.ping();

      if (response !== 'PONG') {
        throw new Error(`Unexpected Redis ping response: ${String(response)}`);
      }

      return indicator.up();
    } catch {
      return indicator.down();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
