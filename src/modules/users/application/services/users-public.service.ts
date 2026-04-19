import { Injectable } from '@nestjs/common';
import {
  ActiveUsersPage,
  ActiveUsersPageQuery,
} from '../../domain/active-user';
import { UsersPublicService } from '../../users.public';
import { EnsureUserExistsUseCase } from '../use-cases/ensure-user-exists.use-case';
import { ListActiveUsersUseCase } from '../use-cases/list-active-users.use-case';

@Injectable()
export class UsersModulePublicService implements UsersPublicService {
  constructor(
    private readonly ensureUserExistsUseCase: EnsureUserExistsUseCase,
    private readonly listActiveUsersUseCase: ListActiveUsersUseCase,
  ) {}

  ensureExists(id: string): Promise<void> {
    return this.ensureUserExistsUseCase.execute(id);
  }

  findActiveUsersPage(query: ActiveUsersPageQuery): Promise<ActiveUsersPage> {
    return this.listActiveUsersUseCase.execute(query);
  }
}
