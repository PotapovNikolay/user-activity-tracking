import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppConfigModule } from '../config/app-config.module';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health-indicator.service';
import { RedisHealthIndicator } from './redis-health-indicator.service';

@Module({
  imports: [AppConfigModule, TerminusModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
