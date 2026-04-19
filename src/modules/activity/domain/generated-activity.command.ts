import { ActivityType } from './activity-type';

export interface GeneratedActivityCommand {
  userId: string;
  activityType: ActivityType;
  scheduledAt: Date;
}
