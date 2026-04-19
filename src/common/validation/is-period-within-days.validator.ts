import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { toUtcTimestampOrNull } from '../date/utc-date.util';

type MaxDaysResolver = number | (() => number);

export function IsPeriodWithinDays(
  otherProperty: string,
  maxDays: MaxDaysResolver,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isPeriodWithinDays',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [otherProperty, maxDays],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [otherKey, maxDaysConstraint] = args.constraints as [
            string,
            MaxDaysResolver,
          ];
          const allowedDays = resolveMaxDays(maxDaysConstraint);
          const other = (args.object as Record<string, unknown>)[otherKey];
          const left = toUtcTimestampOrNull(value);
          const right = toUtcTimestampOrNull(other);

          if (left === null || right === null) {
            return true;
          }

          const maxRangeMs = allowedDays * 24 * 60 * 60 * 1000;
          return right - left <= maxRangeMs;
        },
        defaultMessage(args: ValidationArguments): string {
          const [, maxDaysConstraint] = args.constraints as [
            string,
            MaxDaysResolver,
          ];
          const allowedDays = resolveMaxDays(maxDaysConstraint);
          return `period must not exceed ${allowedDays} days`;
        },
      },
    });
  };
}

function resolveMaxDays(value: MaxDaysResolver): number {
  return typeof value === 'function' ? value() : value;
}
