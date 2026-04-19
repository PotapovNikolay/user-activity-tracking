import { ACTIVITY_TYPES } from './domain/activity-type';
import type { ActivityType } from './domain/activity-type';

export { ACTIVITY_TYPES };
export type { ActivityType };

export interface ScheduleActivityGenerationCommand {
  userId: string;
  scheduledAt: string;
  activityType: ActivityType;
}

export interface ActivityPublicService {
  scheduleGeneration(command: ScheduleActivityGenerationCommand): Promise<void>;
}
