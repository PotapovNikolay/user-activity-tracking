export interface ActiveUser {
  id: string;
  email: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ActiveUsersPageCursor {
  createdAt: Date;
  id: string;
}

export interface ActiveUsersPageQuery {
  limit: number;
  after?: ActiveUsersPageCursor;
}

export interface ActiveUsersPage {
  items: ActiveUser[];
  nextCursor?: ActiveUsersPageCursor;
}
