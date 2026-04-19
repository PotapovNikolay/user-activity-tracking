import { Prisma } from '@prisma/client';
import { ActivityType } from './activity-type';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  source: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  summary: Prisma.JsonValue | null;
  createdAt: Date;
}
