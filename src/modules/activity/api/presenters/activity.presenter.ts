import { ActivityItem } from '../../domain/activity-item';
import { ActivityItemResponse } from '../dto/activity-item.response';
import { ActivityPeriodResponse } from '../dto/activity-period.response';
import { serializeActivityPageCursor } from '../pagination/activity-page-cursor';
import { ActivityPeriodResponseParams } from './activity-period-response.params';

export function toActivityItemResponse(
  item: ActivityItem,
): ActivityItemResponse {
  return {
    id: item.id,
    type: item.type,
    source: item.source,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    durationSeconds: item.durationSeconds,
    summary: item.summary,
    createdAt: item.createdAt,
  };
}

export function toActivityPeriodResponse(
  params: ActivityPeriodResponseParams,
): ActivityPeriodResponse {
  return {
    userId: params.userId,
    from: params.from,
    to: params.to,
    items: params.items.map(toActivityItemResponse),
    nextCursor: params.nextCursor
      ? serializeActivityPageCursor(params.nextCursor)
      : undefined,
  };
}
