import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  ActiveUsersPage,
  ActiveUsersPageCursor,
  ActiveUsersPageQuery,
} from '../domain/active-user';
import { UserIdReference } from '../domain/user-id-reference';
import { UserProfile } from '../domain/user-profile';

type ActiveUserRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    timezone: true;
    isActive: true;
    createdAt: true;
  };
}>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findId(id: string): Promise<UserIdReference | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async findActivePage(query: ActiveUsersPageQuery): Promise<ActiveUsersPage> {
    const users = await this.prisma.user.findMany({
      where: this.buildFindActiveWhere(query.after),
      select: {
        id: true,
        email: true,
        timezone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const visibleUsers = users.slice(0, query.limit);

    return {
      items: visibleUsers,
      nextCursor: this.getNextCursor(users, visibleUsers, query.limit),
    };
  }

  private buildFindActiveWhere(
    after?: ActiveUsersPageCursor,
  ): Prisma.UserWhereInput {
    if (!after) {
      return { isActive: true };
    }

    return {
      isActive: true,
      OR: [
        { createdAt: { gt: after.createdAt } },
        {
          AND: [{ createdAt: after.createdAt }, { id: { gt: after.id } }],
        },
      ],
    };
  }

  private getNextCursor(
    users: ActiveUserRow[],
    visibleUsers: ActiveUserRow[],
    limit: number,
  ): ActiveUsersPageCursor | undefined {
    if (users.length <= limit) {
      return undefined;
    }

    const lastUser = visibleUsers.at(-1);
    if (!lastUser) {
      return undefined;
    }

    return {
      createdAt: lastUser.createdAt,
      id: lastUser.id,
    };
  }
}
