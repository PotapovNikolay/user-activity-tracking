import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/users.repository';

@Injectable()
export class EnsureUserExistsUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string): Promise<void> {
    const user = await this.usersRepository.findId(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} was not found`);
    }
  }
}
