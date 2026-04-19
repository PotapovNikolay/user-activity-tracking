import { Injectable } from '@nestjs/common';
import {
  ActiveUsersPage,
  ActiveUsersPageQuery,
} from '../../domain/active-user';
import { UsersRepository } from '../../infrastructure/users.repository';

@Injectable()
export class ListActiveUsersUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  execute(query: ActiveUsersPageQuery): Promise<ActiveUsersPage> {
    return this.usersRepository.findActivePage(query);
  }
}
