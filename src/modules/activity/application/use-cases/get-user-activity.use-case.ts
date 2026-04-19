import { Injectable } from '@nestjs/common';
import { ActivityPage } from '../../domain/activity-page';
import { ActivityPeriod } from '../../domain/activity-period';
import { ActivityUserPreconditionsService } from '../services/activity-user-preconditions.service';
import { ActivityRepository } from '../../infrastructure/activity.repository';

@Injectable()
export class GetUserActivityUseCase {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly activityUserPreconditions: ActivityUserPreconditionsService,
  ) {}

  async execute(userId: string, period: ActivityPeriod): Promise<ActivityPage> {
    await this.activityUserPreconditions.ensureTargetUserExists(userId);
    return this.activityRepository.findByUserAndPeriod(userId, period);
  }
}
