import { ActivityItem } from './activity-item';

export interface ActivityPageCursor {
  startedAt: Date;
  id: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  nextCursor?: ActivityPageCursor;
}
