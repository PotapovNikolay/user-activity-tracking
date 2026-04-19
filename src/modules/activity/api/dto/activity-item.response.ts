import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class ActivityItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ format: 'date-time' })
  startedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endedAt!: Date;

  @ApiProperty()
  durationSeconds!: number;

  @ApiPropertyOptional({
    nullable: true,
    oneOf: [
      { type: 'object', additionalProperties: true },
      { type: 'array', items: {} },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
    ],
  })
  summary!: Prisma.JsonValue | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
