import { ActiveUsersPage, ActiveUsersPageQuery } from './domain/active-user';

export interface UsersPublicService {
  ensureExists(id: string): Promise<void>;
  findActiveUsersPage(query: ActiveUsersPageQuery): Promise<ActiveUsersPage>;
}
