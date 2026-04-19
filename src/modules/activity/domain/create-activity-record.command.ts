import { Prisma } from '@prisma/client';
import { ActivityType } from './activity-type';

export interface CreateActivityRecordCommand {
  userId: string;
  type: ActivityType;
  source: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  summary: Prisma.InputJsonObject;
}
