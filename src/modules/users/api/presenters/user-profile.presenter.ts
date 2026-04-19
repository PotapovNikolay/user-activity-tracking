import { UserProfile } from '../../domain/user-profile';
import { UserProfileResponse } from '../dto/user-profile.response';

export function toUserProfileResponse(user: UserProfile): UserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
