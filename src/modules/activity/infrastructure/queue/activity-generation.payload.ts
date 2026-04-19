import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsIn, IsUUID, validateSync } from 'class-validator';
import { IsIsoDateTimeWithTz } from '../../../../common/validation/is-iso-datetime-with-tz.validator';
import { ACTIVITY_TYPES } from '../../domain/activity-type';
import type { ActivityType } from '../../domain/activity-type';

export class ActivityGenerationPayload {
  @IsUUID()
  userId!: string;

  @IsIsoDateTimeWithTz()
  scheduledAt!: string;

  @IsIn(ACTIVITY_TYPES)
  activityType!: ActivityType;
}

export function parseActivityGenerationPayload(
  payload: unknown,
): ActivityGenerationPayload {
  const parsedPayload = plainToInstance(ActivityGenerationPayload, payload);
  const errors = validateSync(parsedPayload, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const message = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(', ');

    throw new Error(`Invalid activity generation payload: ${message}`);
  }

  return parsedPayload;
}
