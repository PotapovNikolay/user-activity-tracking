export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
