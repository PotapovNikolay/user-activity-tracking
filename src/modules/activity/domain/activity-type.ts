export const ACTIVITY_TYPES = ['walking', 'running', 'workout'] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
