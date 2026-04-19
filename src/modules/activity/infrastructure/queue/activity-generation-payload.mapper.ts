import { parseUtcDateTime } from '../../../../common/date/utc-date.util';
import { GeneratedActivityCommand } from '../../domain/generated-activity.command';
import { ActivityGenerationPayload } from './activity-generation.payload';

export function toGeneratedActivityCommand(
  payload: ActivityGenerationPayload,
): GeneratedActivityCommand {
  return {
    userId: payload.userId,
    activityType: payload.activityType,
    scheduledAt: parseUtcDateTime(payload.scheduledAt),
  };
}
