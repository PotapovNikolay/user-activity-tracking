import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import type { LivenessResponse } from './contracts/liveness.response';
import { PrismaHealthIndicator } from './prisma-health-indicator.service';
import { RedisHealthIndicator } from './redis-health-indicator.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'user-activity-tracking' },
      },
    },
  })
  @Get('liveness')
  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      service: 'user-activity-tracking',
    };
  }

  @ApiOperation({ summary: 'Readiness probe for database and Redis' })
  @ApiOkResponse({ description: 'Application dependencies are reachable' })
  @Get('readiness')
  @HealthCheck()
  getReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealthIndicator.isHealthy('postgres'),
      () => this.redisHealthIndicator.isHealthy('redis'),
    ]);
  }
}
