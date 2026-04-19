export function utcNow(): Date {
  return new Date();
}

export function utcNowIsoString(): string {
  return utcNow().toISOString();
}

export function parseUtcDateTime(value: string): Date {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid UTC datetime: ${value}`);
  }

  return date;
}

export function utcDateFromMillis(timestamp: number): Date {
  return new Date(timestamp);
}

export function toUtcTimestampOrNull(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return null;
}
