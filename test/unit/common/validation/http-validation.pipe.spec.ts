import { toValidationErrorDetails } from '../../../../src/common/validation/http-validation.pipe';

describe('toValidationErrorDetails', () => {
  it('maps validation errors to a stable response shape', () => {
    expect(
      toValidationErrorDetails([
        {
          property: 'from',
          constraints: {
            isBeforeOrEqual: 'from must be <= to',
          },
          children: [],
        } as never,
      ]),
    ).toEqual([
      {
        field: 'from',
        constraints: ['from must be <= to'],
      },
    ]);
  });
});
