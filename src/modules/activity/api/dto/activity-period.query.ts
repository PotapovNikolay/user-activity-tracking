import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';
import { IsBeforeOrEqual } from '../../../../common/validation/is-before-or-equal.validator';
import { IsIsoDateTimeWithTz } from '../../../../common/validation/is-iso-datetime-with-tz.validator';
import { IsPeriodWithinDays } from '../../../../common/validation/is-period-within-days.validator';
import {
  DEFAULT_ACTIVITY_PAGE_SIZE,
  getConfiguredActivityMaxPeriodDays,
  MAX_ACTIVITY_PAGE_SIZE,
} from '../pagination/activity-page-cursor';
import { IsActivityPageCursor } from '../validation/is-activity-page-cursor.validator';
import { ACTIVITY_TYPES } from '../../domain/activity-type';
import type { ActivityType } from '../../domain/activity-type';

export class ActivityPeriodQuery {
  @ApiProperty({
    format: 'date-time',
    example: '2026-04-01T00:00:00.000Z',
    description:
      'Period start, ISO-8601 with explicit timezone (Z or +HH:MM/-HH:MM)',
  })
  @IsIsoDateTimeWithTz()
  @IsBeforeOrEqual('to')
  @IsPeriodWithinDays('to', getConfiguredActivityMaxPeriodDays)
  from!: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-04-17T23:59:59.999Z',
    description:
      'Period end, ISO-8601 with explicit timezone (Z or +HH:MM/-HH:MM)',
  })
  @IsIsoDateTimeWithTz()
  to!: string;

  @ApiPropertyOptional({ example: 'running' })
  @IsOptional()
  @MaxLength(64)
  @IsIn(ACTIVITY_TYPES)
  type?: ActivityType;

  @ApiPropertyOptional({
    example: DEFAULT_ACTIVITY_PAGE_SIZE,
    default: DEFAULT_ACTIVITY_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_ACTIVITY_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ACTIVITY_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    example: '2026-04-17T09:30:00.000Z|550e8400-e29b-41d4-a716-446655440000',
    description: 'Pagination cursor returned by the previous page',
  })
  @IsOptional()
  @MaxLength(128)
  @IsActivityPageCursor()
  cursor?: string;
}
