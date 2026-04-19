import { Inject, Injectable } from '@nestjs/common';
import { USERS_PUBLIC_SERVICE } from '../../../../shared/kernel/module-tokens';
import type { UsersPublicService } from '../../../users/users.public';

@Injectable()
export class ActivityUserPreconditionsService {
  constructor(
    @Inject(USERS_PUBLIC_SERVICE)
    private readonly usersPublicService: UsersPublicService,
  ) {}

  ensureTargetUserExists(userId: string): Promise<void> {
    return this.usersPublicService.ensureExists(userId);
  }
}
