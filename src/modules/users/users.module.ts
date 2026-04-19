import { Module } from '@nestjs/common';
import { USERS_PUBLIC_SERVICE } from '../../shared/kernel/module-tokens';
import { UsersController } from './api/users.controller';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile.use-case';
import { EnsureUserExistsUseCase } from './application/use-cases/ensure-user-exists.use-case';
import { ListActiveUsersUseCase } from './application/use-cases/list-active-users.use-case';
import { UsersModulePublicService } from './application/services/users-public.service';
import { UsersRepository } from './infrastructure/users.repository';

@Module({
  controllers: [UsersController],
  providers: [
    UsersRepository,
    GetUserProfileUseCase,
    EnsureUserExistsUseCase,
    ListActiveUsersUseCase,
    UsersModulePublicService,
    {
      provide: USERS_PUBLIC_SERVICE,
      useExisting: UsersModulePublicService,
    },
  ],
  exports: [USERS_PUBLIC_SERVICE],
})
export class UsersModule {}
