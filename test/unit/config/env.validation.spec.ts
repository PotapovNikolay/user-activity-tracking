import {
  validateEnv,
  LogLevel,
  NodeEnv,
} from '../../../src/config/env.validation';

describe('validateEnv', () => {
  it('applies defaults and coerces numeric values', () => {
    const env = validateEnv({
      APP_PORT: '4000',
      REDIS_PORT: '6380',
    });

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.APP_PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe(LogLevel.Info);
    expect(env.REDIS_PORT).toBe(6380);
    expect(env.DATABASE_URL).toBe(
      'postgresql://app:app@localhost:5432/user_activity_tracking?schema=public',
    );
  });

  it('throws when numeric env values are invalid', () => {
    expect(() =>
      validateEnv({
        APP_PORT: '0',
      }),
    ).toThrow(/Environment validation failed/);
  });
});
