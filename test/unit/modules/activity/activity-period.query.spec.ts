import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validateEnv } from '../../../../src/config/env.validation';
import { DEFAULT_ACTIVITY_PAGE_SIZE } from '../../../../src/modules/activity/api/pagination/activity-page-cursor';
import { ActivityPeriodQuery } from '../../../../src/modules/activity/api/dto/activity-period.query';

const VALID_PERIOD_QUERY = {
  from: '2026-04-01T00:00:00.000Z',
  to: '2026-04-17T23:59:59.999Z',
};

describe('ActivityPeriodQuery', () => {
  beforeAll(() => {
    validateEnv({});
  });

  it('accepts UTC Z datetimes', async () => {
    await expectValidQuery({
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-17T23:59:59.999Z',
    });
  });

  it('accepts explicit offset datetimes', async () => {
    await expectValidQuery({
      from: '2026-04-01T00:00:00+03:00',
      to: '2026-04-17T23:59:59+03:00',
    });
  });

  it('rejects datetimes without timezone', async () => {
    const errors = await validateQuery({
      from: '2026-04-01T00:00:00',
      to: '2026-04-17T23:59:59',
    });

    expect(errors).not.toHaveLength(0);
  });

  it('rejects plain date strings', async () => {
    const errors = await validateQuery({
      from: '2026-04-01',
      to: '2026-04-17',
    });

    expect(errors).not.toHaveLength(0);
  });

  it('rejects when from > to', async () => {
    const errors = await validateQuery({
      from: '2026-04-20T00:00:00.000Z',
      to: '2026-04-10T00:00:00.000Z',
    });

    expect(errors).toContain('from must be <= to');
  });

  it('allows from == to', async () => {
    await expectValidQuery({
      from: '2026-04-10T00:00:00.000Z',
      to: '2026-04-10T00:00:00.000Z',
    });
  });

  it('rejects unsupported activity type values', async () => {
    const errors = await validateQuery({
      ...VALID_PERIOD_QUERY,
      type: 'sleeping',
    });

    expect(errors).not.toHaveLength(0);
  });

  it('accepts valid limit and cursor values', async () => {
    await expectValidQuery({
      ...VALID_PERIOD_QUERY,
      limit: String(DEFAULT_ACTIVITY_PAGE_SIZE),
      cursor: '2026-04-17T09:30:00.000Z|550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('rejects periods longer than the maximum allowed range', async () => {
    const errors = await validateQuery({
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-05-15T00:00:00.000Z',
    });

    expect(errors).toContain('period must not exceed 31 days');
  });

  it('rejects invalid cursor values', async () => {
    const errors = await validateQuery({
      ...VALID_PERIOD_QUERY,
      cursor: 'bad-cursor',
    });

    expect(errors).toContain('cursor must be a valid activity page cursor');
  });

  it('rejects limit values above the page size cap', async () => {
    const errors = await validateQuery({
      ...VALID_PERIOD_QUERY,
      limit: '101',
    });

    expect(errors).toContain('limit must not be greater than 100');
  });
});

async function expectValidQuery(
  payload: Record<string, unknown>,
): Promise<void> {
  await expect(validateQuery(payload)).resolves.toEqual([]);
}

async function validateQuery(
  payload: Record<string, unknown>,
): Promise<string[]> {
  const instance = plainToInstance(ActivityPeriodQuery, payload);
  const errors = await validate(instance);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}
