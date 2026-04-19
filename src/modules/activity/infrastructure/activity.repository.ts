import { Injectable } from '@nestjs/common';
import { Activity, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ActivityPage, ActivityPageCursor } from '../domain/activity-page';
import { ActivityItem } from '../domain/activity-item';
import { ActivityPeriod } from '../domain/activity-period';
import type { ActivityType } from '../domain/activity-type';
import { CreateActivityRecordCommand } from '../domain/create-activity-record.command';

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndPeriod(
    userId: string,
    period: ActivityPeriod,
  ): Promise<ActivityPage> {
    const activities = await this.prisma.activity.findMany({
      where: this.buildActivityWhere(userId, period),
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: period.limit + 1,
    });

    const visibleActivities = this.getVisibleActivities(
      activities,
      period.limit,
    );

    return {
      items: visibleActivities.map((activity) => this.toActivityItem(activity)),
      nextCursor: this.getNextCursor(
        activities,
        visibleActivities,
        period.limit,
      ),
    };
  }

  async create(data: CreateActivityRecordCommand): Promise<boolean> {
    const result = await this.prisma.activity.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count > 0;
  }

  private buildActivityWhere(
    userId: string,
    period: ActivityPeriod,
  ): Prisma.ActivityWhereInput {
    const baseWhere = this.buildBaseWhere(userId, period);

    if (!period.cursor) {
      return baseWhere;
    }

    return {
      AND: [baseWhere, this.buildCursorWhere(period.cursor)],
    };
  }

  private buildBaseWhere(
    userId: string,
    period: ActivityPeriod,
  ): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = {
      userId,
      startedAt: { lt: period.to },
      endedAt: { gt: period.from },
    };

    if (period.type) {
      where.type = period.type;
    }

    return where;
  }

  private buildCursorWhere(
    cursor: ActivityPageCursor,
  ): Prisma.ActivityWhereInput {
    return {
      OR: [
        { startedAt: { lt: cursor.startedAt } },
        {
          AND: [{ startedAt: cursor.startedAt }, { id: { lt: cursor.id } }],
        },
      ],
    };
  }

  private getVisibleActivities(
    activities: Activity[],
    limit: number,
  ): Activity[] {
    return activities.slice(0, limit);
  }

  private getNextCursor(
    activities: Activity[],
    visibleActivities: Activity[],
    limit: number,
  ): ActivityPageCursor | undefined {
    if (activities.length <= limit) {
      return undefined;
    }

    const lastVisibleActivity = visibleActivities.at(-1);
    if (!lastVisibleActivity) {
      return undefined;
    }

    return {
      startedAt: lastVisibleActivity.startedAt,
      id: lastVisibleActivity.id,
    };
  }

  private toActivityItem(activity: Activity): ActivityItem {
    return {
      id: activity.id,
      type: activity.type as ActivityType,
      source: activity.source,
      startedAt: activity.startedAt,
      endedAt: activity.endedAt,
      durationSeconds: activity.durationSeconds,
      summary: activity.summary,
      createdAt: activity.createdAt,
    };
  }
}
