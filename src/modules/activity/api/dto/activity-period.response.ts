import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityItemResponse } from './activity-item.response';

export class ActivityPeriodResponse {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'date-time' })
  from!: string;

  @ApiProperty({ format: 'date-time' })
  to!: string;

  @ApiProperty({ type: [ActivityItemResponse] })
  items!: ActivityItemResponse[];

  @ApiPropertyOptional({
    example: '2026-04-17T09:30:00.000Z|550e8400-e29b-41d4-a716-446655440000',
  })
  nextCursor?: string;
}
