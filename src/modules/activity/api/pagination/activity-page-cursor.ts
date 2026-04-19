import { parseUtcDateTime } from '../../../../common/date/utc-date.util';
import { ENV_KEYS } from '../../../../config/env.constants';
import { ActivityPageCursor } from '../../domain/activity-page';

export const DEFAULT_ACTIVITY_PAGE_SIZE = 50;
export const MAX_ACTIVITY_PAGE_SIZE = 100;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function serializeActivityPageCursor(
  cursor: ActivityPageCursor,
): string {
  return `${cursor.startedAt.toISOString()}|${cursor.id}`;
}

export function parseActivityPageCursor(value: string): ActivityPageCursor {
  const [startedAtRaw, id] = value.split('|');

  if (!startedAtRaw || !id || !UUID_PATTERN.test(id)) {
    throw new Error(`Invalid activity page cursor: ${value}`);
  }

  return {
    startedAt: parseUtcDateTime(startedAtRaw),
    id,
  };
}

export function isActivityPageCursor(value: string): boolean {
  try {
    parseActivityPageCursor(value);
    return true;
  } catch {
    return false;
  }
}

export function getConfiguredActivityMaxPeriodDays(): number {
  const parsedValue = Number.parseInt(
    process.env[ENV_KEYS.ACTIVITY_MAX_PERIOD_DAYS] ?? '',
    10,
  );

  if (Number.isNaN(parsedValue)) {
    throw new Error(
      `${ENV_KEYS.ACTIVITY_MAX_PERIOD_DAYS} must be validated before HTTP DTO validation runs`,
    );
  }

  return parsedValue;
}
