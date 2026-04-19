import { ActivityPageCursor } from './activity-page';
import { ActivityType } from './activity-type';

export interface ActivityPeriod {
  from: Date;
  to: Date;
  limit: number;
  cursor?: ActivityPageCursor;
  type?: ActivityType;
}
