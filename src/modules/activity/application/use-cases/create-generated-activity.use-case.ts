import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { utcDateFromMillis } from '../../../../common/date/utc-date.util';
import { GeneratedActivityCommand } from '../../domain/generated-activity.command';
import { ActivityUserPreconditionsService } from '../services/activity-user-preconditions.service';
import { ActivityRepository } from '../../infrastructure/activity.repository';

@Injectable()
export class CreateGeneratedActivityUseCase {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly activityUserPreconditions: ActivityUserPreconditionsService,
  ) {}

  async execute(command: GeneratedActivityCommand): Promise<boolean> {
    await this.activityUserPreconditions.ensureTargetUserExists(command.userId);

    const endedAt = command.scheduledAt;
    const durationSeconds = randomInt(900, 5400);
    const startedAt = utcDateFromMillis(
      endedAt.getTime() - durationSeconds * 1000,
    );

    const summary: Prisma.InputJsonObject = {
      steps: randomInt(1200, 9000),
      calories: randomInt(120, 900),
      distanceMeters: roundToTwoDecimals(randomFloat(1000, 12000)),
      avgHeartRate: randomInt(95, 155),
      maxHeartRate: randomInt(140, 190),
    };

    return this.activityRepository.create({
      userId: command.userId,
      type: command.activityType,
      source: 'system',
      startedAt,
      endedAt,
      durationSeconds,
      summary,
    });
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
