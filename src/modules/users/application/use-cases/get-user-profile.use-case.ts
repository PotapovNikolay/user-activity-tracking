import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfile } from '../../domain/user-profile';
import { UsersRepository } from '../../infrastructure/users.repository';

@Injectable()
export class GetUserProfileUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string): Promise<UserProfile> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} was not found`);
    }

    return user;
  }
}
