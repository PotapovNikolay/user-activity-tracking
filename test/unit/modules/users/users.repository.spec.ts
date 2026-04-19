import { ActiveUser } from '../../../../src/modules/users/domain/active-user';
import { UsersRepository } from '../../../../src/modules/users/infrastructure/users.repository';

function createActiveUser(
  overrides: Partial<ActiveUser> & Pick<ActiveUser, 'id'>,
): ActiveUser {
  return {
    email: `${overrides.id}@example.com`,
    timezone: 'UTC',
    isActive: true,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createRepository(findManyMock: jest.Mock): UsersRepository {
  return new UsersRepository({
    user: { findMany: findManyMock },
  } as never);
}

describe('UsersRepository', () => {
  const findManyMock = jest.fn();
  let repository: UsersRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createRepository(findManyMock);
  });

  it('reads one extra record to compute nextCursor without over-reporting the final page', async () => {
    const users = [
      createActiveUser({
        id: 'user-1',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      createActiveUser({
        id: 'user-2',
        createdAt: new Date('2026-04-01T00:01:00.000Z'),
      }),
      createActiveUser({
        id: 'user-3',
        createdAt: new Date('2026-04-01T00:02:00.000Z'),
      }),
    ];

    findManyMock.mockResolvedValue(users);

    const page = await repository.findActivePage({ limit: 2 });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        timezone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 3,
    });
    expect(page.items).toEqual([users[0], users[1]]);
    expect(page.nextCursor).toEqual({
      id: users[1].id,
      createdAt: users[1].createdAt,
    });
  });

  it('does not return nextCursor for the final page', async () => {
    findManyMock.mockResolvedValue([
      createActiveUser({
        id: 'user-1',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    ]);

    const page = await repository.findActivePage({ limit: 2 });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeUndefined();
  });
});
