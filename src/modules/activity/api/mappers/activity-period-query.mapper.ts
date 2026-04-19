import { parseUtcDateTime } from '../../../../common/date/utc-date.util';
import { ActivityPeriod } from '../../domain/activity-period';
import {
  DEFAULT_ACTIVITY_PAGE_SIZE,
  parseActivityPageCursor,
} from '../pagination/activity-page-cursor';
import { ActivityPeriodQuery } from '../dto/activity-period.query';

export function toActivityPeriod(query: ActivityPeriodQuery): ActivityPeriod {
  return {
    from: parseUtcDateTime(query.from),
    to: parseUtcDateTime(query.to),
    limit: query.limit ?? DEFAULT_ACTIVITY_PAGE_SIZE,
    cursor: query.cursor ? parseActivityPageCursor(query.cursor) : undefined,
    type: query.type,
  };
}
