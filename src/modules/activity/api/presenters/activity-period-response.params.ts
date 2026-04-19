import { ActivityPageCursor } from '../../domain/activity-page';
import { ActivityItem } from '../../domain/activity-item';

export interface ActivityPeriodResponseParams {
  userId: string;
  from: string;
  to: string;
  items: ActivityItem[];
  nextCursor?: ActivityPageCursor;
}
