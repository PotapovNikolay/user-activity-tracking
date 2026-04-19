import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GetUserActivityUseCase } from '../application/use-cases/get-user-activity.use-case';
import { ActivityPeriodQuery } from './dto/activity-period.query';
import { ActivityPeriodResponse } from './dto/activity-period.response';
import { toActivityPeriod } from './mappers/activity-period-query.mapper';
import { toActivityPeriodResponse } from './presenters/activity.presenter';

@ApiTags('Activity')
@Controller('users/:userId/activity')
export class ActivityController {
  constructor(
    private readonly getUserActivityUseCase: GetUserActivityUseCase,
  ) {}

  @ApiOperation({ summary: 'Get user activity for a period' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ type: ActivityPeriodResponse })
  @Get()
  async getUserActivity(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query() query: ActivityPeriodQuery,
  ): Promise<ActivityPeriodResponse> {
    const page = await this.getUserActivityUseCase.execute(
      userId,
      toActivityPeriod(query),
    );

    return toActivityPeriodResponse({
      userId,
      from: query.from,
      to: query.to,
      items: page.items,
      nextCursor: page.nextCursor,
    });
  }
}
